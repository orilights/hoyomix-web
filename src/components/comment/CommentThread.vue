<script setup lang="ts">
import type { Comment, CommentThread as CommentThreadData } from '@/types/comment'
import { toast } from 'vue-sonner'
import { COMMENT_REPLY_PAGE_SIZE, CommentApiError, getCommentLocationApi } from '@/api/comment'
import { useCommentRepliesQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'

const props = withDefaults(defineProps<{
  thread: CommentThreadData
  postId: string
  replyTarget: Comment | null
  replyContent: string
  forceExpanded?: boolean
  newReplyId?: string | null
  targetCommentId?: string | null
  targetReplyPage?: number | null
}>(), {
  forceExpanded: false,
  newReplyId: null,
  targetCommentId: null,
  targetReplyPage: null,
})

const emit = defineEmits<{
  'reply': [comment: Comment]
  'update:replyContent': [content: string]
  'cancelReply': []
  'created': [payload: { id: string, state: string, postId: string, userId: string, threadId: string | null }]
  'changed': []
  'located': [threadId: string]
}>()

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const expanded = ref(false)
const page = ref(1)
const locatingNewReply = ref(false)
const locatingReply = ref<string | null>(null)
const pendingLocatedId = ref<string | null>(null)
let locateRequest = 0
const replies = ref<Comment[]>([...props.thread.replies])
const replyPagination = ref({ page: 1, pageSize: COMMENT_REPLY_PAGE_SIZE, total: props.thread.replyCount, totalPages: Math.ceil(props.thread.replyCount / COMMENT_REPLY_PAGE_SIZE) })
const threadId = computed(() => props.thread.threadId)
const postId = toRef(props, 'postId')
const userId = computed(() => user.value?.id ?? null)

const repliesQuery = useCommentRepliesQuery(threadId, postId, page, userId, expanded)
const firstReplyNumber = computed(() => expanded.value
  ? (replyPagination.value.page - 1) * replyPagination.value.pageSize + 1
  : 1)
const paginationPages = computed(() => {
  const total = replyPagination.value.totalPages
  if (total <= 7)
    return Array.from({ length: total }, (_, index) => index + 1)
  return [...new Set([1, page.value - 1, page.value, page.value + 1, total])]
    .filter(value => value >= 1 && value <= total)
    .sort((a, b) => a - b)
})
const visibleReplyNumbers = computed(() => new Map(
  (expanded.value ? replies.value : props.thread.replies)
    .map((comment, index) => [comment.id, firstReplyNumber.value + index] as const),
))

function replyNumberOf(id: string | null) {
  return id ? visibleReplyNumbers.value.get(id) : undefined
}

watch(() => props.thread, (thread) => {
  if (page.value === 1)
    replies.value = [...thread.replies]
  replyPagination.value = { ...replyPagination.value, total: thread.replyCount, totalPages: Math.ceil(thread.replyCount / COMMENT_REPLY_PAGE_SIZE) }
}, { deep: true })

watch(repliesQuery.data, (data) => {
  if (!data || data.pagination.page !== page.value)
    return
  const targetPage = props.newReplyId && locatingNewReply.value
    ? Math.max(1, Math.ceil(data.pagination.total / COMMENT_REPLY_PAGE_SIZE))
    : page.value
  if (targetPage !== page.value) {
    page.value = targetPage
    return
  }
  replies.value = [...data.data]
  replyPagination.value = data.pagination
  const targetId = props.targetCommentId ?? pendingLocatedId.value ?? props.newReplyId
  if (targetId && data.data.some(comment => comment.id === targetId)) {
    nextTick(() => {
      if (focusComment(targetId)) {
        locatingNewReply.value = false
        pendingLocatedId.value = null
        locatingReply.value = null
        emit('located', props.thread.threadId)
      }
    })
  }
}, { immediate: true })

watch(() => props.forceExpanded, (value) => {
  if (value)
    expanded.value = true
}, { immediate: true })

watch(() => props.newReplyId, (id) => {
  if (!id)
    return
  expanded.value = true
  page.value = 1
  locatingNewReply.value = true
  nextTick(() => repliesQuery.refetch())
}, { immediate: true })

watch([() => props.targetCommentId, () => props.targetReplyPage], ([id, replyPage]) => {
  if (!id)
    return
  if (replyPage == null) {
    nextTick(() => {
      if (focusComment(id))
        emit('located', props.thread.threadId)
    })
    return
  }
  expanded.value = true
  page.value = replyPage
  nextTick(() => {
    if (focusComment(id)) {
      emit('located', props.thread.threadId)
      return
    }
    repliesQuery.refetch()
  })
}, { immediate: true })

function expand() {
  expanded.value = true
}

function goToReplyPage(targetPage: number) {
  if (targetPage < 1 || targetPage > replyPagination.value.totalPages || targetPage === page.value)
    return
  page.value = targetPage
}

function onReply(comment: Comment) {
  emit('reply', comment)
}

function focusComment(id: string) {
  const element = document.getElementById(`comment-${id}`)
  if (!element)
    return false
  element.scrollIntoView({ block: 'center' })
  element.focus({ preventScroll: true })
  element.animate([
    { backgroundColor: 'transparent' },
    { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
    { backgroundColor: 'transparent' },
    { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
    { backgroundColor: 'transparent' },
  ], { duration: 2000, easing: 'ease-in-out' })
  return true
}

async function locateReply(id: string) {
  if (locatingReply.value === id)
    return
  const request = ++locateRequest
  const currentPostId = props.postId
  const currentThreadId = props.thread.threadId
  locatingReply.value = id
  try {
    const location = await getCommentLocationApi(id, currentPostId)
    if (request !== locateRequest || props.postId !== currentPostId || props.thread.threadId !== currentThreadId)
      return
    if (location.threadId !== currentThreadId) {
      toast.error('被回复的评论不存在或不可见')
      return
    }
    if (focusComment(id))
      return
    if (location.replyPage == null)
      throw new CommentApiError(404, 'Comment not found')
    pendingLocatedId.value = id
    expanded.value = true
    page.value = location.replyPage
    await nextTick()
    await repliesQuery.refetch()
  }
  catch (error) {
    if (request !== locateRequest)
      return
    pendingLocatedId.value = null
    toast.error(error instanceof CommentApiError && error.code === 404
      ? '被回复的评论不存在或不可见'
      : '定位评论失败，请稍后重试')
  }
  finally {
    if (request === locateRequest && !pendingLocatedId.value)
      locatingReply.value = null
  }
}

watch([postId, threadId], () => {
  locateRequest++
  locatingReply.value = null
  pendingLocatedId.value = null
})

onBeforeUnmount(() => {
  locateRequest++
})
</script>

<template>
  <section class="border-b border-black/5 dark:border-white/5 last:border-b-0">
    <CommentItem :comment="thread.root" @reply="onReply" @locate-reply="locateReply" @changed="emit('changed')">
      <template v-if="replyTarget?.id === thread.root.id" #reply-composer>
        <CommentInput
          :model-value="replyContent"
          :post-id="postId"
          :reply-to="thread.root"
          class="mt-3"
          @update:model-value="emit('update:replyContent', $event)"
          @cancel-reply="emit('cancelReply')"
          @created="emit('created', $event)"
        />
      </template>
    </CommentItem>

    <div v-if="thread.replyCount" class="ml-6 md:ml-12 pl-3">
      <div v-if="expanded">
        <CommentItem v-for="(comment, index) in replies" :key="comment.id" :comment="comment" :depth="1" :reply-number="firstReplyNumber + index" :reply-to-number="replyNumberOf(comment.replyTo)" @reply="onReply" @locate-reply="locateReply" @changed="emit('changed')">
          <template v-if="replyTarget?.id === comment.id" #reply-composer>
            <CommentInput
              :model-value="replyContent"
              :post-id="postId"
              :reply-to="comment"
              :reply-to-number="replyNumberOf(comment.id)"
              class="mt-3"
              @update:model-value="emit('update:replyContent', $event)"
              @cancel-reply="emit('cancelReply')"
              @created="emit('created', $event)"
            />
          </template>
        </CommentItem>
        <div v-if="repliesQuery.isError.value" class="py-3 text-xs text-red-500">
          回复加载失败
          <AppButton size="xs" variant="ghost" @click="repliesQuery.refetch">
            重试
          </AppButton>
        </div>
        <div v-if="repliesQuery.isFetching.value" class="py-3 flex items-center gap-2 text-xs text-gray-400">
          <LucideLoader2 class="size-4 animate-spin" />
          加载回复中
        </div>
        <nav v-if="!repliesQuery.isError.value && replyPagination.totalPages > 1" class="flex items-center gap-1 py-3" aria-label="回复分页">
          <AppButton icon-only size="xs" variant="ghost" aria-label="上一页回复" :disabled="page <= 1 || repliesQuery.isFetching.value" @click="goToReplyPage(page - 1)">
            <LucideChevronLeft class="size-4" />
          </AppButton>
          <template v-for="(pageNumber, index) in paginationPages" :key="pageNumber">
            <span v-if="index > 0 && pageNumber - paginationPages[index - 1]! > 1" class="px-1 text-xs text-gray-400">…</span>
            <AppButton
              size="xs"
              :variant="pageNumber === page ? 'primary' : 'ghost'"
              :aria-label="`第 ${pageNumber} 页回复`"
              :aria-current="pageNumber === page ? 'page' : undefined"
              :disabled="repliesQuery.isFetching.value"
              @click="goToReplyPage(pageNumber)"
            >
              {{ pageNumber }}
            </AppButton>
          </template>
          <AppButton icon-only size="xs" variant="ghost" aria-label="下一页回复" :disabled="page >= replyPagination.totalPages || repliesQuery.isFetching.value" @click="goToReplyPage(page + 1)">
            <LucideChevronRight class="size-4" />
          </AppButton>
        </nav>
      </div>
      <div v-else>
        <CommentItem v-for="(comment, index) in thread.replies" :key="comment.id" :comment="comment" :depth="1" :reply-number="index + 1" :reply-to-number="replyNumberOf(comment.replyTo)" @reply="onReply" @locate-reply="locateReply" @changed="emit('changed')">
          <template v-if="replyTarget?.id === comment.id" #reply-composer>
            <CommentInput
              :model-value="replyContent"
              :post-id="postId"
              :reply-to="comment"
              :reply-to-number="replyNumberOf(comment.id)"
              class="mt-3"
              @update:model-value="emit('update:replyContent', $event)"
              @cancel-reply="emit('cancelReply')"
              @created="emit('created', $event)"
            />
          </template>
        </CommentItem>
        <AppButton v-if="thread.replyCount > thread.replies.length" size="sm" variant="ghost" @click="expand">
          查看全部 {{ thread.replyCount }} 条回复
        </AppButton>
      </div>
    </div>
  </section>
</template>

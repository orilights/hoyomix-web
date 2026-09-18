<script setup lang="ts">
import type { Comment, CommentThread as CommentThreadData } from '@/types/comment'
import { toast } from 'vue-sonner'
import { CommentApiError, getCommentApi, getCommentRepliesApi } from '@/api/comment'
import { useCommentRepliesQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'

const props = withDefaults(defineProps<{
  thread: CommentThreadData
  postId: string
  replyTarget: Comment | null
  replyContent: string
  forceExpanded?: boolean
  newReplyId?: string | null
}>(), {
  forceExpanded: false,
  newReplyId: null,
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
const jumpedToNewReply = ref(false)
const locatingReply = ref<string | null>(null)
let locateRequest = 0
const replies = ref<Comment[]>([...props.thread.replies])
const replyPagination = ref({ page: 1, pageSize: 20, total: props.thread.replyCount, totalPages: Math.ceil(props.thread.replyCount / 20) })
const threadId = computed(() => props.thread.threadId)
const postId = toRef(props, 'postId')
const userId = computed(() => user.value?.id ?? null)

const repliesQuery = useCommentRepliesQuery(threadId, postId, page, userId, expanded)
const firstReplyNumber = computed(() => expanded.value && jumpedToNewReply.value
  ? (replyPagination.value.page - 1) * replyPagination.value.pageSize + 1
  : 1)
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
  replyPagination.value = { ...replyPagination.value, total: thread.replyCount, totalPages: Math.ceil(thread.replyCount / 20) }
}, { deep: true })

watch(repliesQuery.data, (data) => {
  if (!data || data.pagination.page !== page.value)
    return
  const targetPage = props.newReplyId ? Math.max(1, Math.ceil(data.pagination.total / 20)) : 1
  if (targetPage > page.value) {
    jumpedToNewReply.value = true
    page.value = targetPage
    return
  }
  replies.value = jumpedToNewReply.value || page.value === 1 ? [...data.data] : [...replies.value, ...data.data]
  replyPagination.value = data.pagination
  if (props.newReplyId && data.data.some(comment => comment.id === props.newReplyId)) {
    const newReplyId = props.newReplyId
    nextTick(() => {
      if (props.newReplyId !== newReplyId)
        return
      const element = document.getElementById(`comment-${newReplyId}`)
      if (!element)
        return
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      emit('located', props.thread.threadId)
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
  jumpedToNewReply.value = false
  nextTick(() => repliesQuery.refetch())
}, { immediate: true })

watch(() => props.thread.replyCount, (count) => {
  if (!props.newReplyId)
    return
  const targetPage = Math.max(1, Math.ceil(count / 20))
  if (targetPage > page.value) {
    jumpedToNewReply.value = true
    page.value = targetPage
  }
})

function expand() {
  expanded.value = true
}

function loadMore() {
  expand()
  if (!repliesQuery.isFetching.value && page.value < replyPagination.value.totalPages)
    page.value++
}

function showEarlierReplies() {
  jumpedToNewReply.value = false
  replies.value = []
  page.value = 1
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
    const target = await getCommentApi(id)
    if (request !== locateRequest || props.postId !== currentPostId || props.thread.threadId !== currentThreadId)
      return
    if (target.postId !== currentPostId || (target.id !== currentThreadId && target.parent !== currentThreadId)) {
      toast.error('被回复的评论不存在或不可见')
      return
    }
    if (focusComment(id))
      return

    if (target.id !== currentThreadId) {
      const totalPages = Math.ceil(props.thread.replyCount / 20)
      for (let targetPage = 1; targetPage <= totalPages; targetPage++) {
        const result = await getCommentRepliesApi(currentThreadId, currentPostId, targetPage)
        if (request !== locateRequest || props.postId !== currentPostId || props.thread.threadId !== currentThreadId)
          return
        if (!result.data.some(comment => comment.id === id))
          continue
        jumpedToNewReply.value = targetPage > 1
        replies.value = [...result.data]
        replyPagination.value = result.pagination
        page.value = targetPage
        expanded.value = true
        await nextTick()
        if (focusComment(id))
          return
        break
      }
    }
    toast.error('被回复的评论不存在或不可见')
  }
  catch (error) {
    if (request !== locateRequest)
      return
    toast.error(error instanceof CommentApiError && error.code === 404
      ? '被回复的评论不存在或不可见'
      : '定位评论失败，请稍后重试')
  }
  finally {
    if (request === locateRequest)
      locatingReply.value = null
  }
}

watch([postId, threadId], () => {
  locateRequest++
  locatingReply.value = null
})

onBeforeUnmount(() => {
  locateRequest++
})
</script>

<template>
  <section class="border-b border-black/5 last:border-b-0">
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
        <AppButton v-if="!repliesQuery.isError.value && page < replyPagination.totalPages" size="sm" variant="ghost" :disabled="repliesQuery.isFetching.value" @click="loadMore">
          加载更多回复
        </AppButton>
        <AppButton v-if="jumpedToNewReply && page > 1" size="sm" variant="ghost" @click="showEarlierReplies">
          查看较早回复
        </AppButton>
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

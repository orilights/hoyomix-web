<script setup lang="ts">
import type { Comment, CommentThread } from '@/types/comment'
import { useQueryClient } from '@tanstack/vue-query'
import { useCommentThreadsQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'
import { rememberCommentRoute } from '@/utils/comment-route'

const props = defineProps<{
  postId: string
  title?: string
}>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { user } = storeToRefs(auth)
const queryClient = useQueryClient()
const postId = toRef(props, 'postId')
const userId = computed(() => user.value?.id ?? null)
const page = ref(1)
const threads = ref<CommentThread[]>([])
const commentCount = ref(0)
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const replyTarget = ref<Comment | null>(null)
const forceExpanded = ref(new Set<string>())
const replyJump = ref(new Map<string, string>())
const content = ref('')
const notificationTarget = ref<{ commentId: string, threadId: string, replyPage: number | null } | null>(null)

const threadsQuery = useCommentThreadsQuery(postId, userId, page)

function resetList() {
  page.value = 1
  threads.value = []
  commentCount.value = 0
  pagination.value = { page: 1, pageSize: 20, total: 0, totalPages: 0 }
  replyTarget.value = null
  forceExpanded.value = new Set()
  replyJump.value = new Map()
}

watch(postId, () => {
  resetList()
  content.value = ''
})
watch(userId, resetList)
watch([postId, () => route.path], ([currentPostId, path]) => {
  if (currentPostId)
    rememberCommentRoute(currentPostId, path)
}, { immediate: true })

function positiveInteger(value: unknown) {
  if (typeof value !== 'string')
    return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

watch([postId, userId, () => route.query], ([currentPostId, , query]) => {
  if (query.commentPostId !== currentPostId || typeof query.commentId !== 'string' || typeof query.commentThreadId !== 'string')
    return
  const threadPage = positiveInteger(query.commentThreadPage)
  if (!threadPage)
    return
  if (page.value !== threadPage) {
    page.value = threadPage
    threads.value = []
  }
  notificationTarget.value = {
    commentId: query.commentId,
    threadId: query.commentThreadId,
    replyPage: positiveInteger(query.commentReplyPage),
  }
  forceExpanded.value = new Set(forceExpanded.value).add(query.commentThreadId)
}, { immediate: true, deep: true })

watch(threadsQuery.data, (data) => {
  if (!data)
    return
  threads.value = page.value === 1
    ? [...data.data]
    : [...threads.value, ...data.data.filter(thread => !threads.value.some(existing => existing.threadId === thread.threadId))]
  commentCount.value = data.commentCount ?? data.pagination.total
  pagination.value = data.pagination
}, { immediate: true })

function loadMoreThreads() {
  if (page.value < pagination.value.totalPages)
    page.value++
}

function replyTo(comment: Comment) {
  replyTarget.value = comment
  nextTick(() => {
    const input = document.getElementById(`comment-${comment.id}`)?.querySelector('textarea')
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    input?.focus({ preventScroll: true })
  })
}

function invalidateComments(targetPostId = props.postId) {
  queryClient.invalidateQueries({ queryKey: ['commentThreads', targetPostId] })
  queryClient.invalidateQueries({ queryKey: ['commentReplies', targetPostId] })
}

function onCreated(payload: { id: string, state: string, postId: string, userId: string, threadId: string | null }) {
  invalidateComments(payload.postId)
  if (payload.postId !== props.postId || payload.userId !== userId.value)
    return
  if (payload.threadId) {
    forceExpanded.value = new Set(forceExpanded.value).add(payload.threadId)
    replyJump.value = new Map(replyJump.value).set(payload.threadId, payload.id)
  }
  else {
    page.value = 1
  }
  replyTarget.value = null
}

function onLocated(threadId: string) {
  const next = new Map(replyJump.value)
  next.delete(threadId)
  replyJump.value = next
  if (notificationTarget.value?.threadId !== threadId)
    return
  notificationTarget.value = null
  const query = { ...route.query }
  delete query.commentPostId
  delete query.commentId
  delete query.commentThreadId
  delete query.commentThreadPage
  delete query.commentReplyPage
  router.replace({ query })
}

function onChanged() {
  invalidateComments()
}
</script>

<template>
  <section class="mt-6 bg-black/5 rounded-xl p-4 md:p-6">
    <div class="flex items-center justify-between gap-3 mb-4">
      <h2 class="text-lg font-semibold text-gray-900">
        {{ title ?? '评论' }}
      </h2>
      <span v-if="commentCount" class="text-sm text-gray-400">{{ commentCount }} 条</span>
    </div>

    <CommentInput
      v-if="!replyTarget"
      v-model="content"
      :post-id="postId"
      @created="onCreated"
    />

    <div v-if="threadsQuery.isError.value" class="py-10 text-center text-sm text-red-400">
      评论加载失败，请稍后重试
      <AppButton size="sm" variant="ghost" class="ml-2" @click="threadsQuery.refetch">
        重试
      </AppButton>
    </div>
    <div v-else-if="threadsQuery.isPending.value && !threads.length" class="py-10 flex items-center justify-center gap-2 text-sm text-gray-400">
      <LucideLoader2 class="size-5 animate-spin" />
      加载评论中
    </div>
    <div v-else-if="!threads.length" class="py-10 text-center text-sm text-gray-400">
      还没有评论，来留下第一条吧
    </div>
    <div v-else class="mt-4">
      <CommentThread
        v-for="thread in threads"
        :key="thread.threadId"
        v-model:reply-content="content"
        :thread="thread"
        :post-id="postId"
        :reply-target="replyTarget"
        :force-expanded="forceExpanded.has(thread.threadId)"
        :new-reply-id="replyJump.get(thread.threadId) ?? null"
        :target-comment-id="notificationTarget?.threadId === thread.threadId ? notificationTarget.commentId : null"
        :target-reply-page="notificationTarget?.threadId === thread.threadId ? notificationTarget.replyPage : null"
        @reply="replyTo"
        @cancel-reply="replyTarget = null"
        @created="onCreated"
        @changed="onChanged"
        @located="onLocated"
      />
      <div v-if="threadsQuery.isFetching.value" class="py-3 flex items-center justify-center gap-2 text-xs text-gray-400">
        <LucideLoader2 class="size-4 animate-spin" />
        加载中
      </div>
      <AppButton v-if="page < pagination.totalPages" class="mt-3" size="sm" variant="ghost" @click="loadMoreThreads">
        加载更多评论
      </AppButton>
    </div>
  </section>
</template>

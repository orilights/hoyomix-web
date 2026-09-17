<script setup lang="ts">
import type { Comment, CommentThread as CommentThreadData } from '@/types/comment'
import { useCommentRepliesQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'

const props = withDefaults(defineProps<{
  thread: CommentThreadData
  postId: string
  forceExpanded?: boolean
  newReplyId?: string | null
}>(), {
  forceExpanded: false,
  newReplyId: null,
})

const emit = defineEmits<{
  reply: [comment: Comment]
  changed: []
  located: [threadId: string]
}>()

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const expanded = ref(false)
const page = ref(1)
const jumpedToNewReply = ref(false)
const replies = ref<Comment[]>([...props.thread.replies])
const replyPagination = ref({ page: 1, pageSize: 20, total: props.thread.replyCount, totalPages: Math.ceil(props.thread.replyCount / 20) })
const threadId = computed(() => props.thread.threadId)
const postId = toRef(props, 'postId')
const userId = computed(() => user.value?.id ?? null)

const repliesQuery = useCommentRepliesQuery(threadId, postId, page, userId, expanded)

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
</script>

<template>
  <section class="border-b border-black/5 last:border-b-0">
    <CommentItem :comment="thread.root" @reply="onReply" @changed="emit('changed')" />

    <div v-if="thread.replyCount" class="ml-6 md:ml-12 border-l-2 border-blue-100 pl-4">
      <div v-if="expanded">
        <CommentItem v-for="comment in replies" :key="comment.id" :comment="comment" :depth="1" @reply="onReply" @changed="emit('changed')" />
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
        <CommentItem v-for="comment in thread.replies" :key="comment.id" :comment="comment" :depth="1" @reply="onReply" @changed="emit('changed')" />
        <AppButton v-if="thread.replyCount > thread.replies.length" size="sm" variant="ghost" @click="expand">
          查看全部 {{ thread.replyCount }} 条回复
        </AppButton>
      </div>
    </div>
  </section>
</template>

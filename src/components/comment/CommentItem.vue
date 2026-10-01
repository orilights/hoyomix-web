<script setup lang="ts">
import type { Comment, VoteType } from '@/types/comment'
import { useResizeObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { CommentApiError, deleteCommentApi, updateCommentApi, voteCommentApi } from '@/api/comment'
import { useAuthStore } from '@/store/auth'

const props = withDefaults(defineProps<{
  comment: Comment
  depth?: 0 | 1
  replyNumber?: number
  replyToNumber?: number
}>(), {
  depth: 0,
})

const emit = defineEmits<{
  reply: [comment: Comment]
  locateReply: [id: string]
  changed: []
}>()

const auth = useAuthStore()
const { user, isLoggedIn, canWriteComments } = storeToRefs(auth)
const localComment = ref<Comment>({ ...props.comment })
const editing = ref(false)
const editContent = ref('')
const saving = ref(false)
const voting = ref(false)
const contentElement = useTemplateRef<HTMLParagraphElement>('contentElement')
const commentCollapsed = ref(props.comment.collapse === 5)
const contentCollapsed = ref(true)
const hasMoreContent = ref(false)

function measureContent() {
  const element = contentElement.value
  if (!element)
    return
  const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
  hasMoreContent.value = element.scrollHeight > lineHeight * 10 + 1
}

useResizeObserver(contentElement, measureContent)
watch([() => localComment.value.id, () => localComment.value.content], () => {
  contentCollapsed.value = true
  nextTick(measureContent)
})

watch(() => props.comment, (comment, previousComment) => {
  localComment.value = { ...comment }
  if (comment.id !== previousComment?.id || comment.collapse !== previousComment?.collapse)
    commentCollapsed.value = comment.collapse === 5
}, { deep: true })

const isOwner = computed(() => isLoggedIn.value && user.value?.id === localComment.value.userId)
const canWrite = canWriteComments
const vote = computed(() => localComment.value.userVote ?? null)

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function revealComment() {
  commentCollapsed.value = false
}

function startEdit() {
  editContent.value = localComment.value.content
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editContent.value = ''
}

async function saveEdit() {
  const value = editContent.value.trim()
  if (!value || value.length > 2000) {
    toast.error(value ? '评论不能超过 2000 个字符' : '请输入评论内容')
    return
  }
  saving.value = true
  try {
    await updateCommentApi(localComment.value.id, value)
    localComment.value = { ...localComment.value, content: value, updatedAt: new Date().toISOString() }
    cancelEdit()
    toast.success('评论已更新')
    emit('changed')
  }
  catch (error) {
    if (error instanceof CommentApiError && error.code === 401) {
      toast.error('登录已过期，请重新登录后提交')
      auth.openAuthDialog()
    }
    else {
      toast.error(error instanceof Error ? error.message : '评论更新失败')
    }
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  // eslint-disable-next-line no-alert
  if (!window.confirm('确定删除这条评论吗？'))
    return
  saving.value = true
  try {
    await deleteCommentApi(localComment.value.id)
    toast.success('评论已删除')
    emit('changed')
  }
  catch (error) {
    if (error instanceof CommentApiError && error.code === 401) {
      toast.error('登录已过期，请重新登录后重试')
      auth.openAuthDialog()
    }
    else {
      toast.error(error instanceof Error ? error.message : '评论删除失败')
    }
  }
  finally {
    saving.value = false
  }
}

async function voteComment(type: VoteType) {
  if (!auth.requireLogin() || !canWrite.value || voting.value)
    return
  const previous = localComment.value
  const next = previous.userVote === type ? null : type
  localComment.value = {
    ...previous,
    userVote: next,
    upvoteCount: previous.upvoteCount + (next === 1 ? 1 : 0) - (previous.userVote === 1 ? 1 : 0),
  }
  voting.value = true
  try {
    await voteCommentApi(previous.id, type)
    emit('changed')
  }
  catch (error) {
    localComment.value = previous
    if (error instanceof CommentApiError && error.code === 401)
      auth.openAuthDialog()
    else
      toast.error(error instanceof Error ? error.message : '投票失败')
  }
  finally {
    voting.value = false
  }
}
</script>

<template>
  <article :id="`comment-${localComment.id}`" tabindex="-1" class="border-b border-black/5 dark:border-white/5 last:border-b-0 focus:outline-none" :class="depth === 1 ? 'py-2' : 'py-4'" @focus="revealComment">
    <div v-if="commentCollapsed" class="flex min-h-8 flex-wrap items-center gap-2 text-sm text-gray-400">
      <LucideEyeOff class="size-4 shrink-0" aria-hidden="true" />
      <span>该评论已被折叠</span>
      <AppButton
        size="xs"
        variant="ghost"
        :aria-controls="`comment-details-${localComment.id}`"
        :aria-expanded="false"
        @click="revealComment"
      >
        展开评论
        <LucideChevronDown class="size-3.5" />
      </AppButton>
    </div>
    <div v-else :id="`comment-details-${localComment.id}`" class="flex items-start" :class="depth === 1 ? 'gap-2' : 'gap-3'">
      <div class="rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-blue-500 text-white font-medium" :class="depth === 1 ? 'size-7 text-xs' : 'size-9 text-sm'">
        <img v-if="localComment.user.image" :src="localComment.user.image" :alt="localComment.user.name" class="size-full object-cover">
        <span v-else>{{ initial(localComment.user.name) }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap text-sm">
          <span class="font-medium text-gray-800 dark:text-gray-200">{{ localComment.user.name }}</span>
          <span v-if="replyNumber" class="text-xs text-gray-400">#{{ replyNumber }}</span>
          <span v-if="localComment.state === 'pending'" class="px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 text-xs">审核中</span>
          <span v-else-if="localComment.state === 'rejected'" class="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 text-xs">未通过</span>
          <span class="text-xs text-gray-400">{{ new Date(localComment.createdAt).toLocaleString() }}</span>
          <button
            v-if="localComment.replyTo && localComment.replyToUser"
            type="button"
            class="cursor-pointer text-xs text-gray-400 hover:text-blue-600 hover:dark:text-blue-400 focus-visible:outline-none focus-visible:underline"
            title="查看被回复的评论"
            @click="emit('locateReply', localComment.replyTo)"
          >
            回复 <span class="text-blue-500">@{{ localComment.replyToUser.name }}</span><span v-if="replyToNumber" class="ml-1 text-blue-500">#{{ replyToNumber }}</span>
          </button>
        </div>
        <textarea
          v-if="editing"
          v-model="editContent"
          rows="3"
          maxlength="2000"
          class="mt-2 w-full resize-y rounded-lg border border-blue-300 bg-white/70 dark:bg-[var(--theme-surface)]/70 p-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-blue-400/30"
        />
        <p
          v-else
          :id="`comment-content-${localComment.id}`"
          ref="contentElement"
          class="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-gray-300"
          :class="[depth === 1 ? 'mt-1' : 'mt-2', contentCollapsed ? 'max-h-60 overflow-hidden' : '']"
        >
          {{ localComment.content }}
        </p>
        <AppButton
          v-if="!editing && hasMoreContent"
          size="xs"
          variant="ghost"
          class="mt-1"
          :aria-controls="`comment-content-${localComment.id}`"
          :aria-expanded="!contentCollapsed"
          @click="contentCollapsed = !contentCollapsed"
        >
          {{ contentCollapsed ? '展开全文' : '收起' }}
          <LucideChevronDown v-if="contentCollapsed" class="size-3.5" />
          <LucideChevronUp v-else class="size-3.5" />
        </AppButton>
        <div class="flex items-center gap-1" :class="depth === 1 ? 'mt-1' : 'mt-2'">
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" title="点赞" aria-label="点赞" :aria-pressed="vote === 1" :class="vote === 1 ? 'text-blue-500' : ''" :disabled="voting || (isLoggedIn && !canWrite)" @click="voteComment(1)">
            <LucideThumbsUp class="size-4" :fill="vote === 1 ? 'currentColor' : 'none'" />
            <span class="ml-1 text-xs">{{ localComment.upvoteCount }}</span>
          </AppButton>
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" title="点踩" aria-label="点踩" :aria-pressed="vote === -1" :class="vote === -1 ? 'text-blue-500' : ''" :disabled="voting || (isLoggedIn && !canWrite)" @click="voteComment(-1)">
            <LucideThumbsDown class="size-4" :fill="vote === -1 ? 'currentColor' : 'none'" />
          </AppButton>
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" title="回复" aria-label="回复" :disabled="voting" @click="emit('reply', localComment)">
            <LucideReply class="size-4" />
          </AppButton>
          <template v-if="isOwner && localComment.state !== 'deleted'">
            <AppButton v-if="!editing && localComment.state === 'rejected'" icon-only size="xs" variant="ghost" title="编辑" aria-label="编辑" :disabled="!canWrite || voting" @click="startEdit">
              <LucidePencil class="size-4" />
            </AppButton>
            <AppButton v-if="!editing" icon-only size="xs" variant="ghost" title="删除" aria-label="删除" :disabled="saving || !canWrite || voting" @click="remove">
              <LucideTrash2 class="size-4" />
            </AppButton>
            <template v-if="editing">
              <AppButton size="xs" variant="primary" :disabled="saving" @click="saveEdit">
                保存
              </AppButton>
              <AppButton size="xs" variant="ghost" :disabled="saving" @click="cancelEdit">
                取消
              </AppButton>
            </template>
          </template>
        </div>
        <slot name="reply-composer" />
      </div>
    </div>
  </article>
</template>

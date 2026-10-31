<script setup lang="ts">
import type { Comment, VoteType } from '@/types/comment'
import { useResizeObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { CommentApiError, deleteCommentApi, updateCommentApi, voteCommentApi } from '@/api/comment'
import { formatNumber, t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { formatCommentTime, formatDateTime } from '@/utils/time'

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
    toast.error(value ? t('CommentItem.comments_cannot_exceed_2000_characters') : t('CommentInput.enter_a_comment'))
    return
  }
  saving.value = true
  try {
    await updateCommentApi(localComment.value.id, value)
    localComment.value = { ...localComment.value, content: value, updatedAt: new Date().toISOString() }
    cancelEdit()
    toast.success(t('CommentItem.comment_updated'))
    emit('changed')
  }
  catch (error) {
    if (error instanceof CommentApiError && error.code === 401) {
      toast.error(t('CommentInput.your_session_has_expired_sign_in_again_to_submit'))
      auth.openAuthDialog()
    }
    else {
      toast.error(error instanceof Error ? error.message : t('CommentItem.failed_to_update_comment'))
    }
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  // eslint-disable-next-line no-alert
  if (!window.confirm(t('CommentItem.delete_this_comment')))
    return
  saving.value = true
  try {
    await deleteCommentApi(localComment.value.id)
    toast.success(t('CommentItem.comment_deleted'))
    emit('changed')
  }
  catch (error) {
    if (error instanceof CommentApiError && error.code === 401) {
      toast.error(t('CommentItem.your_session_has_expired_sign_in_again_to_retry'))
      auth.openAuthDialog()
    }
    else {
      toast.error(error instanceof Error ? error.message : t('CommentItem.failed_to_delete_comment'))
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
      toast.error(error instanceof Error ? error.message : t('CommentItem.vote_failed'))
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
      <span>{{ t('CommentItem.this_comment_has_been_collapsed') }}</span>
      <AppButton
        size="xs"
        variant="ghost"
        :aria-controls="`comment-details-${localComment.id}`"
        :aria-expanded="false"
        @click="revealComment"
      >
        {{ t('CommentItem.expand_comment') }}<LucideChevronDown class="size-3.5" />
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
          <span
            v-for="tag in localComment.user.tags ?? []"
            :key="tag.key"
            class="px-1.5 py-0.5 rounded text-xs font-medium"
            :class="tag.key === 'admin' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'"
          >{{ tag.label }}</span>
          <span v-if="replyNumber" class="text-xs text-gray-400">#{{ replyNumber }}</span>
          <span v-if="localComment.state === 'pending'" class="px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 text-xs">{{ t('MusicActions.pending_review') }}</span>
          <span v-else-if="localComment.state === 'rejected'" class="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 text-xs">{{ t('CommentItem.not_approved') }}</span>
          <button
            v-if="localComment.replyTo && localComment.replyToUser"
            type="button"
            class="cursor-pointer text-xs text-gray-400 hover:text-blue-600 hover:dark:text-blue-400 focus-visible:outline-none focus-visible:underline"
            :title="t('CommentItem.view_the_comment_being_replied_to')"
            @click="emit('locateReply', localComment.replyTo)"
          >
            {{ t('CommentInput.reply') }}<span class="text-blue-500">@{{ localComment.replyToUser.name }}</span><span v-if="replyToNumber" class="ml-1 text-blue-500">#{{ replyToNumber }}</span>
          </button>
        </div>
        <CommentEditor
          v-if="editing"
          v-model="editContent"
          :disabled="saving"
          class="mt-2 rounded-lg border border-blue-300 bg-white/70 dark:bg-[var(--theme-surface)]/70 p-2"
          @submit="!saving && saveEdit()"
        />
        <p
          v-else
          :id="`comment-content-${localComment.id}`"
          ref="contentElement"
          class="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-gray-300"
          :class="[depth === 1 ? 'mt-1' : 'mt-2', contentCollapsed ? 'max-h-60 overflow-hidden' : '']"
        >
          <CommentContent :content="localComment.content" />
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
          {{ contentCollapsed ? t('CommentItem.read_more') : t('CommentItem.collapse') }}
          <LucideChevronDown v-if="contentCollapsed" class="size-3.5" />
          <LucideChevronUp v-else class="size-3.5" />
        </AppButton>
        <div class="flex flex-wrap items-center gap-1" :class="depth === 1 ? 'mt-1' : 'mt-2'">
          <time :datetime="localComment.createdAt" :title="formatDateTime(localComment.createdAt)" class="mr-2 text-xs text-gray-400 whitespace-nowrap">{{ formatCommentTime(localComment.createdAt) }}</time>
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" :title="t('CommentItem.upvote')" :aria-label="t('CommentItem.upvote')" :aria-pressed="vote === 1" :class="vote === 1 ? 'text-blue-500' : ''" :disabled="voting || (isLoggedIn && !canWrite)" @click="voteComment(1)">
            <LucideThumbsUp class="size-4" :fill="vote === 1 ? 'currentColor' : 'none'" />
            <span class="ml-1 text-xs">{{ formatNumber(localComment.upvoteCount) }}</span>
          </AppButton>
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" :title="t('CommentItem.downvote')" :aria-label="t('CommentItem.downvote')" :aria-pressed="vote === -1" :class="vote === -1 ? 'text-blue-500' : ''" :disabled="voting || (isLoggedIn && !canWrite)" @click="voteComment(-1)">
            <LucideThumbsDown class="size-4" :fill="vote === -1 ? 'currentColor' : 'none'" />
          </AppButton>
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" :title="t('CommentInput.reply')" :aria-label="t('CommentInput.reply')" :disabled="voting" @click="emit('reply', localComment)">
            <LucideReply class="size-4" />
          </AppButton>
          <template v-if="isOwner && localComment.state !== 'deleted'">
            <AppButton v-if="!editing && localComment.state === 'rejected'" icon-only size="xs" variant="ghost" :title="t('CommentItem.edit')" :aria-label="t('CommentItem.edit')" :disabled="!canWrite || voting" @click="startEdit">
              <LucidePencil class="size-4" />
            </AppButton>
            <AppButton v-if="!editing" icon-only size="xs" variant="ghost" :title="t('SongVideoEditDialog.delete')" :aria-label="t('SongVideoEditDialog.delete')" :disabled="saving || !canWrite || voting" @click="remove">
              <LucideTrash2 class="size-4" />
            </AppButton>
            <template v-if="editing">
              <AppButton size="xs" variant="primary" :disabled="saving" @click="saveEdit">
                {{ t('CommentItem.save') }}
              </AppButton>
              <AppButton size="xs" variant="ghost" :disabled="saving" @click="cancelEdit">
                {{ t('AlbumPickerDialog.cancel') }}
              </AppButton>
            </template>
          </template>
        </div>
        <slot name="reply-composer" />
      </div>
    </div>
  </article>
</template>

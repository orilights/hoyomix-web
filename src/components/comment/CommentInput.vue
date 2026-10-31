<script setup lang="ts">
import type { Comment } from '@/types/comment'
import { toast } from 'vue-sonner'
import { CommentApiError, createCommentApi, getCommentApi } from '@/api/comment'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'

const props = withDefaults(defineProps<{
  postId: string
  replyTo?: Comment | null
  replyToNumber?: number
}>(), {
  replyTo: null,
})

const emit = defineEmits<{
  created: [payload: { id: string, state: string, postId: string, userId: string, threadId: string | null }]
  cancelReply: []
}>()

const auth = useAuthStore()
const { user, isLoggedIn, canWriteComments } = storeToRefs(auth)
const content = defineModel<string>({ default: '' })
const submitting = ref(false)
const maxLength = 2000

function ensureWritable() {
  if (!auth.requireLogin())
    return false
  if (!canWriteComments.value) {
    toast.error(t('CommentInput.this_account_cannot_post_comments'))
    return false
  }
  return true
}

async function submit() {
  if (submitting.value)
    return
  if (!ensureWritable())
    return
  const value = content.value.trim()
  if (!value) {
    toast.error(t('CommentInput.enter_a_comment'))
    return
  }
  if (value.length > maxLength) {
    toast.error(t('CommentEditor.comments_cannot_exceed_characters', { p0: maxLength }))
    return
  }

  const submittedPostId = props.postId
  const submittedUserId = user.value!.id
  const submittedReplyTo = props.replyTo
  submitting.value = true
  try {
    const result = await createCommentApi({
      postId: submittedPostId,
      content: value,
      ...(submittedReplyTo ? { replyTo: submittedReplyTo.id } : {}),
    })
    let state = 'normal'
    try {
      state = (await getCommentApi(result.id)).state
    }
    catch {
      // 审核状态无法立即读取时仍保留创建成功结果，列表刷新会补齐。
    }
    if (props.postId === submittedPostId && user.value?.id === submittedUserId)
      content.value = ''
    toast.success(state === 'pending' ? t('CommentInput.comment_submitted_for_review') : t('CommentInput.comment_posted'))
    emit('created', {
      id: result.id,
      state,
      postId: submittedPostId,
      userId: submittedUserId,
      threadId: submittedReplyTo ? submittedReplyTo.parent ?? submittedReplyTo.id : null,
    })
  }
  catch (error) {
    if (error instanceof CommentApiError && error.code === 401) {
      toast.error(t('CommentInput.your_session_has_expired_sign_in_again_to_submit'))
      auth.openAuthDialog()
    }
    else {
      toast.error(error instanceof Error ? error.message : t('CommentInput.failed_to_post_comment'))
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-white/65 dark:bg-[var(--theme-surface)]/65 rounded-xl border border-gray-200/80 dark:border-gray-700/80 p-4">
    <div v-if="replyTo" class="mb-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
      <span>{{ t('CommentInput.reply') }}<strong class="text-gray-700 dark:text-gray-300">@{{ replyTo.user.name }}</strong><span v-if="replyToNumber" class="ml-1">#{{ replyToNumber }}</span></span>
      <AppButton icon-only size="xs" variant="ghost" :title="t('CommentInput.cancel_reply')" :aria-label="t('CommentInput.cancel_reply')" @click="emit('cancelReply')">
        <LucideX class="size-4" />
      </AppButton>
    </div>
    <CommentEditor
      v-model="content"
      :disabled="submitting || !isLoggedIn"
      :placeholder="isLoggedIn ? t('CommentEditor.share_your_thoughts') : t('CommentInput.sign_in_to_join_the_discussion')"
      :max-length="maxLength"
      @submit="submit"
    >
      <template #actions>
        <AppButton v-if="!isLoggedIn" variant="primary" size="sm" @click="auth.openAuthDialog()">
          <LucideLogIn class="size-4" />{{ t('DesktopSidebar.sign_in') }}
        </AppButton>
        <AppButton v-else variant="primary" size="sm" :disabled="submitting" @click="submit">
          <LucideLoader2 v-if="submitting" class="size-4 animate-spin" />
          <LucideSend v-else class="size-4" />
          {{ submitting ? t('CommentInput.posting') : t('CommentInput.post') }}
        </AppButton>
      </template>
    </CommentEditor>
  </div>
</template>

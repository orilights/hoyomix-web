<script setup lang="ts">
import type { Comment } from '@/types/comment'
import { toast } from 'vue-sonner'
import { CommentApiError, createCommentApi, getCommentApi } from '@/api/comment'
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
    toast.error('当前账号无法发表评论')
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
    toast.error('请输入评论内容')
    return
  }
  if (value.length > maxLength) {
    toast.error(`评论不能超过 ${maxLength} 个字符`)
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
    toast.success(state === 'pending' ? '评论已提交，正在审核中' : '评论已发表')
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
      toast.error('登录已过期，请重新登录后提交')
      auth.openAuthDialog()
    }
    else {
      toast.error(error instanceof Error ? error.message : '评论发表失败')
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-white/65 rounded-xl border border-gray-200/80 p-4">
    <div v-if="replyTo" class="mb-2 flex items-center justify-between text-sm text-gray-500">
      <span>回复 <strong class="text-gray-700">@{{ replyTo.user.name }}</strong><span v-if="replyToNumber" class="ml-1">#{{ replyToNumber }}</span></span>
      <AppButton icon-only size="xs" variant="ghost" title="取消回复" aria-label="取消回复" @click="emit('cancelReply')">
        <LucideX class="size-4" />
      </AppButton>
    </div>
    <textarea
      v-model="content"
      rows="3"
      maxlength="2000"
      :disabled="submitting || !isLoggedIn"
      class="w-full resize-y bg-transparent outline-none text-sm leading-6 placeholder:text-gray-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
      :placeholder="isLoggedIn ? '写下你的想法…' : '登录后参与讨论'"
      @keydown.ctrl.enter.prevent="submit"
      @keydown.meta.enter.prevent="submit"
    />
    <div class="mt-2 flex items-center justify-between gap-3">
      <span class="text-xs text-gray-400">{{ content.length }}/{{ maxLength }}</span>
      <AppButton v-if="!isLoggedIn" variant="primary" size="sm" @click="auth.openAuthDialog()">
        <LucideLogIn class="size-4" />
        登录
      </AppButton>
      <AppButton v-else variant="primary" size="sm" :disabled="submitting" @click="submit">
        <LucideLoader2 v-if="submitting" class="size-4 animate-spin" />
        <LucideSend v-else class="size-4" />
        {{ submitting ? '发表中' : '发表' }}
      </AppButton>
    </div>
  </div>
</template>

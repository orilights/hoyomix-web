<script setup lang="ts">
import type { Comment, VoteType } from '@/types/comment'
import { toast } from 'vue-sonner'
import { CommentApiError, deleteCommentApi, updateCommentApi, voteCommentApi } from '@/api/comment'
import { useAuthStore } from '@/store/auth'

const props = withDefaults(defineProps<{
  comment: Comment
  depth?: 0 | 1
}>(), {
  depth: 0,
})

const emit = defineEmits<{
  reply: [comment: Comment]
  changed: []
}>()

const auth = useAuthStore()
const { user, isLoggedIn, canWriteComments } = storeToRefs(auth)
const localComment = ref<Comment>({ ...props.comment })
const editing = ref(false)
const editContent = ref('')
const saving = ref(false)
const voting = ref(false)

watch(() => props.comment, (comment) => {
  localComment.value = { ...comment }
}, { deep: true })

const isOwner = computed(() => isLoggedIn.value && user.value?.id === localComment.value.userId)
const canWrite = canWriteComments
const vote = computed(() => localComment.value.userVote ?? null)

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
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
  <article :id="`comment-${localComment.id}`" class="py-4 border-b border-black/5 last:border-b-0">
    <div class="flex items-start gap-3">
      <div class="size-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-blue-500 text-white text-sm font-medium">
        <img v-if="localComment.user.image" :src="localComment.user.image" :alt="localComment.user.name" class="size-full object-cover">
        <span v-else>{{ initial(localComment.user.name) }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap text-sm">
          <span class="font-medium text-gray-800">{{ localComment.user.name }}</span>
          <span v-if="localComment.state === 'pending'" class="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">审核中</span>
          <span v-else-if="localComment.state === 'rejected'" class="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs">未通过</span>
          <span class="text-xs text-gray-400">{{ new Date(localComment.createdAt).toLocaleString() }}</span>
        </div>
        <div v-if="localComment.replyToUser" class="mt-1 text-xs text-gray-400">
          回复 <span class="text-blue-500">@{{ localComment.replyToUser.name }}</span>
        </div>
        <textarea
          v-if="editing"
          v-model="editContent"
          rows="3"
          maxlength="2000"
          class="mt-2 w-full resize-y rounded-lg border border-blue-300 bg-white/70 p-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-blue-400/30"
        />
        <p v-else class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
          {{ localComment.content }}
        </p>
        <div class="mt-2 flex items-center gap-1">
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" title="点赞" aria-label="点赞" :class="vote === 1 ? 'text-blue-500' : ''" :disabled="voting || (isLoggedIn && !canWrite)" @click="voteComment(1)">
            <LucideThumbsUp class="size-4" />
            <span class="ml-1 text-xs">{{ localComment.upvoteCount }}</span>
          </AppButton>
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" title="点踩" aria-label="点踩" :class="vote === -1 ? 'text-blue-500' : ''" :disabled="voting || (isLoggedIn && !canWrite)" @click="voteComment(-1)">
            <LucideThumbsDown class="size-4" />
          </AppButton>
          <AppButton v-if="localComment.state === 'normal'" icon-only size="xs" variant="ghost" title="回复" aria-label="回复" :disabled="voting" @click="emit('reply', localComment)">
            <LucideMessageCircle class="size-4" />
          </AppButton>
          <template v-if="isOwner && localComment.state !== 'deleted'">
            <AppButton v-if="!editing" icon-only size="xs" variant="ghost" title="编辑" aria-label="编辑" :disabled="!canWrite || voting" @click="startEdit">
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
      </div>
    </div>
  </article>
</template>

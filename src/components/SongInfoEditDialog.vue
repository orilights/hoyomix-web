<script setup lang="ts">
import type { SongInfoChange } from '@/types/core'
import { toast } from 'vue-sonner'
import { submitSongInfoEditApi } from '@/api/music'
import { usePendingSongEditRequest } from '@/composables/usePendingSongEditRequest'
import { useAuthStore } from '@/store/auth'

const props = defineProps<{
  songId: number
  name: string
  description: string
  descriptionFull?: string
}>()

const emit = defineEmits<{
  success: []
}>()

const auth = useAuthStore()
const visible = defineModel<boolean>({ required: true })
const { pendingRequest, checking, blocked, checkError, retryCheck, checkBeforeSubmit } = usePendingSongEditRequest(computed(() => props.songId), visible)

const nameInput = ref('')
const descriptionInput = ref('')
const descriptionFullInput = ref('')
const submitting = ref(false)

watch(visible, (v) => {
  if (!v)
    return
  nameInput.value = props.name
  descriptionInput.value = props.description
  descriptionFullInput.value = props.descriptionFull ?? ''
})

watch(() => props.songId, () => {
  visible.value = false
})

async function submit() {
  if (submitting.value || blocked.value)
    return
  const newName = nameInput.value.trim()
  if (!newName) {
    toast.error('请输入歌曲名称')
    return
  }

  const changes: SongInfoChange = {}
  if (newName !== props.name)
    changes.name = newName
  if (descriptionInput.value !== props.description)
    changes.description = descriptionInput.value
  if (props.descriptionFull !== undefined && descriptionFullInput.value !== props.descriptionFull)
    changes.descriptionFull = descriptionFullInput.value

  if (Object.keys(changes).length === 0) {
    toast.error('未做任何修改')
    return
  }

  const submissionSongId = props.songId
  const submissionUserId = auth.user?.id
  submitting.value = true
  try {
    if (!await checkBeforeSubmit())
      return
    const res = await submitSongInfoEditApi(submissionSongId, changes)
    if (props.songId !== submissionSongId || auth.user?.id !== submissionUserId)
      return
    if (res.directApproved)
      toast.success('歌曲信息已更新')
    else
      toast.success('申请已提交，等待审核')
    visible.value = false
    emit('success')
  }
  catch (error) {
    if (props.songId !== submissionSongId || auth.user?.id !== submissionUserId)
      return
    void retryCheck()
    toast.error(error instanceof Error ? error.message : '提交失败')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" :close-on-click-overlay="false" size="md">
    <template #title>
      修改歌曲信息
    </template>

    <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <PendingEditRequestNotice :pending-request="pendingRequest" :checking="checking" :check-error="checkError" @retry="retryCheck()" />

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          歌曲名称 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nameInput"
          type="text"
          placeholder="输入歌曲名称"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          简短描述（可选）
        </label>
        <input
          v-model="descriptionInput"
          type="text"
          placeholder="输入简短描述"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          完整描述（可选）
        </label>
        <textarea
          v-model="descriptionFullInput"
          :disabled="descriptionFull === undefined"
          rows="4"
          placeholder="输入完整描述"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>
    </div>

    <template #footer>
      <div class="px-6 py-4 flex items-center justify-end gap-2">
        <AppButton
          type="button"
          @click="visible = false"
        >
          取消
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          :disabled="submitting || blocked"
          @click="submit"
        >
          <LucideLoader2 v-if="submitting" class="size-4 animate-spin" />
          {{ submitting ? '提交中...' : '提交申请' }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
</style>

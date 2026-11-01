<script setup lang="ts">
import type { SongInfoChange } from '@/types/core'
import { toast } from 'vue-sonner'
import { submitSongInfoEditApi } from '@/api/music'
import { usePendingSongEditRequest } from '@/composables/usePendingSongEditRequest'
import { t } from '@/i18n'
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
    toast.error(t('SongInfoEditDialog.enter_a_song_name'))
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
    toast.error(t('SongInfoEditDialog.no_changes_made'))
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
      toast.success(t('SongInfoEditDialog.song_information_updated'))
    else
      toast.success(t('SongCreditsEditDialog.request_submitted_for_review'))
    visible.value = false
    emit('success')
  }
  catch (error) {
    if (props.songId !== submissionSongId || auth.user?.id !== submissionUserId)
      return
    void retryCheck()
    toast.error(error instanceof Error ? error.message : t('SongCreditsEditDialog.submission_failed'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" :close-on-click-overlay="false" size="md">
    <template #title>
      {{ t('SongInfoEditDialog.edit_song_information') }}
    </template>

    <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <PendingEditRequestNotice :pending-request="pendingRequest" :checking="checking" :check-error="checkError" @retry="retryCheck()" />

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('SongInfoEditDialog.song_name') }}<span class="text-red-500">*</span>
        </label>
        <input
          v-model="nameInput"
          type="text"
          :placeholder="t('SongInfoEditDialog.enter_song_name')"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('SongInfoEditDialog.short_description_optional') }}</label>
        <input
          v-model="descriptionInput"
          type="text"
          :placeholder="t('SongInfoEditDialog.enter_a_short_description')"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('SongInfoEditDialog.full_description_optional') }}</label>
        <textarea
          v-model="descriptionFullInput"
          :disabled="descriptionFull === undefined"
          rows="4"
          :placeholder="t('SongInfoEditDialog.enter_a_full_description')"
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
          {{ t('AlbumPickerDialog.cancel') }}
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          :disabled="submitting || blocked"
          @click="submit"
        >
          <LucideLoader2 v-if="submitting" class="size-4 animate-spin" />
          {{ submitting ? t('SongCreditsEditDialog.submitting') : t('SongCreditsEditDialog.submit_request') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
</style>

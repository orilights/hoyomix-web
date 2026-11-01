<script setup lang="ts">
import type { SongTag } from '@/types/song-tag'
import { toast } from 'vue-sonner'
import { submitSongTagEditApi } from '@/api/song-tags'
import { useSongLyricLanguagesQuery, useSongTagsQuery } from '@/composables/queries'
import { usePendingSongEditRequest } from '@/composables/usePendingSongEditRequest'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { groupSongTags } from '@/types/song-tag'
import { formatLyricLanguage } from '@/utils/lyric-language'

const props = defineProps<{ songId: number, songTags: SongTag[] }>()
const emit = defineEmits<{ success: [] }>()
const visible = defineModel<boolean>({ required: true })
const auth = useAuthStore()
const { data, isPending, isError, refetch } = useSongTagsQuery(visible)
const lyricLanguages = useSongLyricLanguagesQuery(computed(() => props.songId), visible)
const possibleLanguages = computed(() => lyricLanguages.isError.value ? [] : lyricLanguages.data.value?.languages ?? [])
const { pendingRequest, checking, blocked, checkError, retryCheck, checkBeforeSubmit } = usePendingSongEditRequest(computed(() => props.songId), visible)
const selected = ref<number[]>([])
const original = ref<number[]>([])
const submitting = ref(false)
const tags = computed(() => {
  const tagsById = new Map([...props.songTags, ...(data.value ?? [])].map(tag => [tag.id, tag]))
  return [...tagsById.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
})
const tagGroups = computed(() => groupSongTags(tags.value.filter(tag => tag.enabled || original.value.includes(tag.id))))
const added = computed(() => selected.value.filter(id => !original.value.includes(id)))
const removed = computed(() => original.value.filter(id => !selected.value.includes(id)))
const changed = computed(() => added.value.length > 0 || removed.value.length > 0)
watch(visible, (value) => {
  if (value) {
    original.value = props.songTags.map(tag => tag.id)
    selected.value = [...original.value]
  }
})
async function submit() {
  if (!changed.value || submitting.value || blocked.value || isPending.value || isError.value)
    return
  const songId = props.songId
  const userId = auth.user?.id
  const patch = { add: [...added.value], remove: [...removed.value] }
  submitting.value = true
  try {
    if (!await checkBeforeSubmit())
      return
    const result = await submitSongTagEditApi(songId, patch)
    if (props.songId !== songId || auth.user?.id !== userId)
      return
    toast.success(result.directApproved ? t('SongTagEditDialog.song_tags_updated') : t('SongCreditsEditDialog.request_submitted_for_review'))
    visible.value = false
    emit('success')
  }
  catch (error) {
    if (props.songId !== songId || auth.user?.id !== userId)
      return
    void retryCheck()
    toast.error(error instanceof Error ? error.message : t('SongCreditsEditDialog.submission_failed'))
  }
  finally { submitting.value = false }
}
</script>

<template>
  <AppDialog v-model="visible" :title="t('SongTagEditDialog.edit_song_tags')" size="lg" :close-on-click-overlay="false">
    <div class="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
      <PendingEditRequestNotice :pending-request="pendingRequest" :checking="checking" :check-error="checkError" @retry="retryCheck()" />
      <AsyncFade>
        <p v-if="lyricLanguages.isLoading.value" class="text-sm text-gray-400" role="status">
          {{ t('App.loading') }}
        </p>
        <p v-else-if="lyricLanguages.isError.value" class="text-sm text-gray-400" role="alert">
          {{ t('SongTagEditDialog.failed_to_load_lyric_languages') }}<AppButton size="sm" variant="ghost" @click="lyricLanguages.refetch()">
            {{ t('App.retry') }}
          </AppButton>
        </p>
        <p v-else-if="possibleLanguages.length" class="text-sm text-blue-600 dark:text-blue-300" role="status">
          {{ t('SongTagEditDialog.possible_lyric_languages', { p0: possibleLanguages.map(formatLyricLanguage).join('、') }) }}
        </p>
      </AsyncFade>
      <AsyncFade>
        <p v-if="isPending" role="status" class="py-8 text-center text-gray-400">
          {{ t('App.loading') }}
        </p>
        <div v-else-if="isError" class="text-center space-y-2">
          <p class="text-red-400">
            {{ t('SongTagEditDialog.failed_to_load_tags') }}
          </p>
          <AppButton @click="refetch()">
            {{ t('App.retry') }}
          </AppButton>
        </div>
        <fieldset v-else :disabled="blocked || submitting" class="space-y-4">
          <p v-if="!tagGroups.length" class="text-sm text-gray-400">
            {{ t('SongTagEditDialog.no_available_tags') }}
          </p>
          <section v-for="group in tagGroups" :key="group.value" class="space-y-2">
            <h3 class="font-medium text-sm">
              {{ group.label }}
            </h3>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="tag in group.tags"
                :key="tag.id"
                :title="tag.description"
                class="inline-flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-sm"
              >
                <input v-model="selected" type="checkbox" :value="tag.id" class="accent-blue-500">
                {{ tag.name }}<span v-if="!tag.enabled" class="text-xs text-gray-400">{{ t('SongTagEditDialog.disabled') }}</span>
              </label>
            </div>
          </section>
        </fieldset>
      </AsyncFade>
    </div>
    <template #footer>
      <div class="px-5 py-3 flex justify-end gap-2">
        <AppButton @click="visible = false">
          {{ t('AlbumPickerDialog.cancel') }}
        </AppButton>
        <AppButton variant="primary" :disabled="!changed || submitting || blocked || isPending || isError" @click="submit">
          {{ submitting ? t('SongCreditsEditDialog.submitting') : t('SongCreditsEditDialog.submit_request') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

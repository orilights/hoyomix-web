<script setup lang="ts">
import type { SongTag } from '@/types/song-tag'
import { toast } from 'vue-sonner'
import { submitSongTagEditApi } from '@/api/song-tags'
import { useSongLyricLanguagesQuery, useSongTagsQuery } from '@/composables/queries'
import { usePendingSongEditRequest } from '@/composables/usePendingSongEditRequest'
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
    toast.success(result.directApproved ? '歌曲标签已更新' : '申请已提交，等待审核')
    visible.value = false
    emit('success')
  }
  catch (error) {
    if (props.songId !== songId || auth.user?.id !== userId)
      return
    void retryCheck()
    toast.error(error instanceof Error ? error.message : '提交失败')
  }
  finally { submitting.value = false }
}
</script>

<template>
  <AppDialog v-model="visible" title="修改歌曲标签" size="lg" :close-on-click-overlay="false">
    <div class="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
      <PendingEditRequestNotice :pending-request="pendingRequest" :checking="checking" :check-error="checkError" @retry="retryCheck()" />
      <AsyncFade>
        <p v-if="lyricLanguages.isLoading.value" class="text-sm text-gray-400" role="status">
          加载中...
        </p>
        <p v-else-if="lyricLanguages.isError.value" class="text-sm text-gray-400" role="alert">
          歌词语言加载失败
          <AppButton size="sm" variant="ghost" @click="lyricLanguages.refetch()">
            重试
          </AppButton>
        </p>
        <p v-else-if="possibleLanguages.length" class="text-sm text-blue-600 dark:text-blue-300" role="status">
          可能的歌词语言：{{ possibleLanguages.map(formatLyricLanguage).join('、') }}
        </p>
      </AsyncFade>
      <AsyncFade>
        <p v-if="isPending" role="status" class="py-8 text-center text-gray-400">
          加载中...
        </p>
        <div v-else-if="isError" class="text-center space-y-2">
          <p class="text-red-400">
            标签加载失败
          </p>
          <AppButton @click="refetch()">
            重试
          </AppButton>
        </div>
        <fieldset v-else :disabled="blocked || submitting" class="space-y-4">
          <p v-if="!tagGroups.length" class="text-sm text-gray-400">
            暂无可用标签
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
                {{ tag.name }}<span v-if="!tag.enabled" class="text-xs text-gray-400">已停用</span>
              </label>
            </div>
          </section>
        </fieldset>
      </AsyncFade>
    </div>
    <template #footer>
      <div class="px-5 py-3 flex justify-end gap-2">
        <AppButton @click="visible = false">
          取消
        </AppButton>
        <AppButton variant="primary" :disabled="!changed || submitting || blocked || isPending || isError" @click="submit">
          {{ submitting ? '提交中...' : '提交申请' }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

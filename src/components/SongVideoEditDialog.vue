<script setup lang="ts">
import type { TagInfo } from '@/types/core'
import { toast } from 'vue-sonner'
import { submitSongTagsEditApi } from '@/api/music'
import { t } from '@/i18n'

const props = defineProps<{
  songId: number
  tags: TagInfo[]
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = defineModel<boolean>({ required: true })

const sourceOptions = [
  { value: 'web', get label() {
    return t('SongVideoEditDialog.official_website')
  } },
  { value: 'mys', get label() {
    return t('SongVideoEditDialog.hoyolab_china')
  } },
  { value: 'bilibili', get label() {
    return t('SongVideoEditDialog.bilibili')
  } },
]

interface VideoSourceItem {
  source: string
  link: string
  id: string
  coverUrl: string | null
  duration: number | null
}

interface SourceInput {
  source: string
  link: string
  id: string
  coverUrl: string
  duration: string
}

interface PendingVideo {
  title: string
  sources: VideoSourceItem[]
}

// 当前歌曲已有的视频标签（tagType === 'video'）
const existingVideos = computed(() => props.tags
  .filter(t => t.tagType === 'video')
  .map((t) => {
    const data = t.tagData as { sources?: VideoSourceItem[] } | undefined
    return { title: t.tagName, sources: data?.sources ?? [] }
  }))

const title = ref('')
const sourceRows = ref<SourceInput[]>([])
const pendingVideos = ref<PendingVideo[]>([])
const submitting = ref(false)

function emptyRow(): SourceInput {
  return { source: 'web', link: '', id: '', coverUrl: '', duration: '' }
}

watch(visible, (v) => {
  if (!v)
    return
  title.value = ''
  sourceRows.value = [emptyRow()]
  pendingVideos.value = []
})

function addSourceRow() {
  sourceRows.value.push(emptyRow())
}

function removeSourceRow(index: number) {
  sourceRows.value.splice(index, 1)
}

function sourceLabel(source: string) {
  return sourceOptions.find(o => o.value === source)?.label ?? source
}

function selectExistingVideo(vTitle: string) {
  title.value = vTitle
}

function addToPending() {
  const videoTitle = title.value.trim()
  if (!videoTitle) {
    toast.error(t('SongVideoEditDialog.enter_a_video_title'))
    return
  }
  const validSources: VideoSourceItem[] = sourceRows.value
    .filter(s => s.link.trim() && s.id.trim())
    .map((s) => {
      const duration = Number(s.duration)
      return {
        source: s.source,
        link: s.link.trim(),
        id: s.id.trim(),
        coverUrl: s.coverUrl.trim() || null,
        duration: s.duration.trim() && Number.isFinite(duration) ? duration : null,
      }
    })
  if (!validSources.length) {
    toast.error(t('SongVideoEditDialog.add_at_least_one_source_link_and_id_are'))
    return
  }
  pendingVideos.value.push({ title: videoTitle, sources: validSources })
  title.value = ''
  sourceRows.value = [emptyRow()]
}

function removePending(index: number) {
  pendingVideos.value.splice(index, 1)
}

// 合并来源（按 source + link 去重，支持给已有视频追加来源）
function mergeSources(base: VideoSourceItem[], add: VideoSourceItem[]): VideoSourceItem[] {
  const seen = new Set<string>()
  const merged: VideoSourceItem[] = []
  for (const s of [...base, ...add]) {
    const key = `${s.source}|${s.link}`
    if (seen.has(key))
      continue
    seen.add(key)
    merged.push(s)
  }
  return merged
}

const canSubmit = computed(() => pendingVideos.value.length > 0 && !submitting.value)

function close() {
  visible.value = false
}

async function submit() {
  if (!pendingVideos.value.length || submitting.value)
    return
  submitting.value = true
  try {
    const add = pendingVideos.value.map((v) => {
      const existing = existingVideos.value.find(e => e.title === v.title)
      const sources = existing ? mergeSources(existing.sources, v.sources) : v.sources
      return {
        tagType: 'video',
        tagName: v.title,
        tagData: JSON.stringify({ sources }),
      }
    })
    const res = await submitSongTagsEditApi(props.songId, { add })
    if (res.directApproved)
      toast.success(t('SongVideoEditDialog.video_links_updated'))
    else
      toast.success(t('SongCreditsEditDialog.request_submitted_for_review'))
    close()
    emit('success')
  }
  catch (error) {
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
      {{ t('SongVideoEditDialog.edit_video_links') }}
    </template>

    <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <div class="px-3 py-2 rounded-lg bg-orange-100 text-orange-600 text-xs leading-relaxed">
        {{ t('SongVideoEditDialog.changes_take_effect_after_review_only_one_pending_request') }}
      </div>

      <div v-if="existingVideos.length">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {{ t('SongVideoEditDialog.current_videos') }}
        </p>
        <div class="space-y-1">
          <div v-for="v in existingVideos" :key="v.title" class="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
            <div class="flex items-center gap-2">
              <LucideVideo class="size-4 text-gray-400 shrink-0" />
              <span class="truncate flex-1">{{ v.title }}</span>
              <button
                type="button"
                class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:dark:text-blue-400 shrink-0 cursor-pointer"
                @click="selectExistingVideo(v.title)"
              >
                {{ t('SongVideoEditDialog.add_source') }}
              </button>
            </div>
            <div v-if="v.sources.length" class="flex flex-wrap gap-1 mt-1 pl-6">
              <span
                v-for="(s, si) in v.sources"
                :key="si"
                class="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded text-xs text-gray-500 dark:text-gray-400"
              >
                {{ sourceLabel(s.source) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('SongVideoEditDialog.video_title') }}<span class="text-red-500">*</span>
        </label>
        <input
          v-model="title"
          type="text"
          :placeholder="t('SongVideoEditDialog.enter_video_title')"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ t('SongVideoEditDialog.source') }}
          </p>
          <button
            type="button"
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:dark:text-blue-400 cursor-pointer flex items-center gap-0.5"
            @click="addSourceRow"
          >
            <LucidePlus class="size-3.5" />{{ t('SongVideoEditDialog.add_source') }}
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="(row, i) in sourceRows"
            :key="i"
            class="p-2 rounded-lg border border-gray-100 dark:border-gray-700 space-y-2"
          >
            <div class="flex items-center gap-2">
              <select
                v-model="row.source"
                class="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option v-for="o in sourceOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
              <button
                type="button"
                class="text-xs text-red-500 hover:text-red-600 hover:dark:text-red-400 shrink-0 cursor-pointer"
                @click="removeSourceRow(i)"
              >
                {{ t('SongVideoEditDialog.delete') }}
              </button>
            </div>
            <input
              v-model="row.link"
              type="text"
              :placeholder="t('SongVideoEditDialog.video_url')"
              class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
            <input
              v-model="row.id"
              type="text"
              placeholder="ID"
              class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
            <input
              v-model="row.coverUrl"
              type="text"
              :placeholder="t('SongVideoEditDialog.cover_url')"
              class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
            <input
              v-model="row.duration"
              type="text"
              :placeholder="t('SongVideoEditDialog.duration_in_seconds_optional')"
              class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
          </div>
        </div>
      </div>

      <AppButton
        type="button"
        class="w-full"
        @click="addToPending"
      >
        <LucideListPlus class="size-4" />{{ t('SongVideoEditDialog.add_to_pending_list') }}
      </AppButton>

      <div v-if="pendingVideos.length">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {{ t('SongVideoEditDialog.pending_submission') }}
        </p>
        <div class="space-y-1">
          <div
            v-for="(v, i) in pendingVideos"
            :key="i"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-sm"
          >
            <span class="truncate flex-1">{{ v.title }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">{{ t('SongVideoEditDialog.source_alternate', { p0: v.sources.length }, Number(v.sources.length)) }}</span>
            <button
              type="button"
              class="text-xs text-red-500 hover:text-red-600 hover:dark:text-red-400 shrink-0 cursor-pointer"
              @click="removePending(i)"
            >
              {{ t('SongRegionEditDialog.remove') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="px-6 py-4 flex items-center justify-end gap-2">
        <AppButton
          type="button"
          @click="close"
        >
          {{ t('AlbumPickerDialog.cancel') }}
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          :disabled="!canSubmit"
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

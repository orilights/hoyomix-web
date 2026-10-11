<script setup lang="ts">
import type { TagInfo } from '@/types/core'
import { toast } from 'vue-sonner'
import { submitSongTagsEditApi } from '@/api/music'

const props = defineProps<{
  songId: number
  tags: TagInfo[]
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = defineModel<boolean>({ required: true })

const sourceOptions = [
  { value: 'web', label: '官网' },
  { value: 'mys', label: '米游社' },
  { value: 'bilibili', label: '哔哩哔哩' },
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
  const t = title.value.trim()
  if (!t) {
    toast.error('请输入视频标题')
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
    toast.error('请至少填写一个来源（link 与 id 必填）')
    return
  }
  pendingVideos.value.push({ title: t, sources: validSources })
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
      toast.success('视频关联已生效')
    else
      toast.success('申请已提交，等待审核')
    close()
    emit('success')
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '提交失败')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" size="md">
    <template #title>
      修改视频关联
    </template>

    <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <div class="px-3 py-2 rounded-lg bg-orange-100 text-orange-600 text-xs leading-relaxed">
        信息修改需审核后生效，同一资源最多同时存在一条待审核申请
      </div>

      <div v-if="existingVideos.length">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          当前视频
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
                添加来源
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
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          视频标题 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="title"
          type="text"
          placeholder="输入视频标题"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
            来源
          </p>
          <button
            type="button"
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:dark:text-blue-400 cursor-pointer flex items-center gap-0.5"
            @click="addSourceRow"
          >
            <LucidePlus class="size-3.5" />
            添加来源
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
                删除
              </button>
            </div>
            <input
              v-model="row.link"
              type="text"
              placeholder="视频链接"
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
              placeholder="封面连接"
              class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
            <input
              v-model="row.duration"
              type="text"
              placeholder="时长（秒，可选）"
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
        <LucideListPlus class="size-4" />
        加入待提交列表
      </AppButton>

      <div v-if="pendingVideos.length">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          待提交
        </p>
        <div class="space-y-1">
          <div
            v-for="(v, i) in pendingVideos"
            :key="i"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-sm"
          >
            <span class="truncate flex-1">{{ v.title }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">{{ v.sources.length }} 个来源</span>
            <button
              type="button"
              class="text-xs text-red-500 hover:text-red-600 hover:dark:text-red-400 shrink-0 cursor-pointer"
              @click="removePending(i)"
            >
              移除
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
          取消
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          :disabled="!canSubmit"
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

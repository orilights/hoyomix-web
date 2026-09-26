<script setup lang="ts">
import type { RankingPeriod } from '@/api/music'
import type { PlaylistSongItem } from '@/types/core'
import { useUrlSearchParams } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { getRankingApi } from '@/api/music'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'

const player = usePlayerStore()
const store = useMainStore()

usePageSeo({
  title: '热榜',
  description: '热门歌曲榜单',
  path: '/ranking',
})

const periods: { key: RankingPeriod, label: string }[] = [
  { key: '1d', label: '日榜' },
  { key: '7d', label: '周榜' },
  { key: '30d', label: '月榜' },
  { key: '365d', label: '年榜' },
  { key: 'all', label: '总榜' },
]

const params = useUrlSearchParams('history', { removeFalsyValues: true })
const tab = computed<RankingPeriod>({
  get: () => (params.tab as RankingPeriod) || '1d',
  set: (val) => { params.tab = val },
})
const selectedDate = computed<string>({
  get: () => typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : '',
  set: (val) => { params.date = val },
})
const rankingQueryDate = computed(() => tab.value === 'all' ? '' : selectedDate.value)
const songs = ref<PlaylistSongItem[]>([])

registerSongList({ songIds: () => songs.value.map(s => s.songId) })

const rankingDate = ref<string | undefined>()
const displayDate = computed({
  get: () => selectedDate.value || rankingDate.value?.slice(0, 10) || '',
  set: (val: string) => { selectedDate.value = val },
})
const isLoading = ref(false)
let requestId = 0

watch([tab, rankingQueryDate], () => {
  fetchRanking()
})

async function fetchRanking() {
  const currentRequest = ++requestId
  isLoading.value = true
  try {
    const res = await getRankingApi(tab.value, rankingQueryDate.value || undefined)
    if (currentRequest !== requestId)
      return
    songs.value = res.songs
    rankingDate.value = res.date
  }
  catch (e: any) {
    if (currentRequest !== requestId)
      return
    toast.error(e.message ?? '加载失败')
    songs.value = []
    rankingDate.value = undefined
  }
  finally {
    if (currentRequest === requestId)
      isLoading.value = false
  }
}

function playAll() {
  if (!songs.value.length)
    return
  player.replacePlaylist(songs.value, 0)
  toast.success('已替换播放列表')
}

function addAllToPlaylist() {
  let addCount = 0
  for (const song of songs.value) {
    const { isNew } = player.addToPlaylist(song)
    if (isNew)
      addCount++
  }
  toast.success(addCount > 0 ? `已添加 ${addCount} 首至播放列表` : '所有歌曲已在播放列表中')
}

onMounted(() => {
  store.setBackground()
  fetchRanking()
})
</script>

<template>
  <div>
    <PageHeader title="热榜" subtitle="看看大家都在听什么" />

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <SegmentSwitch
        v-model="tab"
        :options="periods"
      />
      <label v-if="tab !== 'all'" class="flex items-center gap-2 text-sm text-gray-500">
        榜单日期
        <input
          v-model="displayDate"
          type="date"
          class="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </label>
      <button
        v-if="tab !== 'all' && selectedDate"
        type="button"
        class="text-sm text-blue-500 hover:text-blue-600 cursor-pointer"
        @click="selectedDate = ''"
      >
        返回最新
      </button>
      <div class="flex-1" />
      <div class="flex gap-2">
        <AppButton
          variant="primary"
          :disabled="!songs.length"
          @click="playAll"
        >
          <LucidePlay class="size-4" fill="currentColor" />
          播放全部
        </AppButton>
        <AppButton
          :disabled="!songs.length"
          @click="addAllToPlaylist"
        >
          <LucideListMusic class="size-4" />
          添加全部
        </AppButton>
      </div>
    </div>

    <AsyncFade>
      <div v-if="isLoading" class="flex items-center justify-center py-20 text-gray-400">
        <LucideLoader2 class="size-6 animate-spin mr-2" />
        加载中...
      </div>

      <SongList
        v-else
        :songs="songs"
        show-cover
        show-album
        ranked
        empty-text="暂无数据"
      />
    </AsyncFade>
  </div>
</template>

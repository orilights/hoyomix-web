<script setup lang="ts">
import type { RankingPeriod } from '@/types/core'
import { useUrlSearchParams } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useRankingQuery } from '@/composables/queries'
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
  get: () => periods.find(p => p.key === params.tab)?.key ?? '1d',
  set: (val) => { params.tab = val },
})
const selectedDate = computed<string>({
  get: () => typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : '',
  set: (val) => { params.date = val },
})
const rankingQueryDate = computed(() => tab.value === 'all' ? '' : selectedDate.value)
const productId = computed<number | undefined>({
  get: () => typeof params.productId === 'string' && /^\d+$/.test(params.productId)
    && Number.isSafeInteger(Number(params.productId)) && Number(params.productId) > 0
    ? Number(params.productId)
    : undefined,
  set: (val) => { params.productId = val === undefined ? '' : String(val) },
})
const productOptions = computed(() => {
  const songCounts = new Map<string, number>()
  for (const album of store.albumList) {
    songCounts.set(album.productName, (songCounts.get(album.productName) ?? 0) + album.songCount)
  }
  return [
    { value: undefined, label: '全部' },
    ...[...store.productList]
      .sort((a, b) => (songCounts.get(b.name) ?? 0) - (songCounts.get(a.name) ?? 0))
      .map(product => ({ value: product.productId, label: product.name })),
  ]
})
const { data, isPending, isFetching, isError, refetch } = useRankingQuery(tab, rankingQueryDate, productId)
const songs = computed(() => isError.value ? [] : data.value?.songs ?? [])
const canPlay = computed(() => !isFetching.value && !isPending.value && !isError.value && songs.value.length > 0)

registerSongList({ songIds: () => songs.value.map(s => s.songId) })

const displayDate = computed({
  get: () => selectedDate.value || data.value?.date?.slice(0, 10) || '',
  set: (val: string) => { selectedDate.value = val },
})

function playAll() {
  if (!canPlay.value)
    return
  player.replacePlaylist(songs.value, 0)
  toast.success('已替换播放列表')
}

function addAllToPlaylist() {
  if (!canPlay.value)
    return
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
      <label v-if="tab !== 'all'" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        榜单日期
        <input
          v-model="displayDate"
          type="date"
          class="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-[var(--theme-surface)]/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </label>
      <AppButton
        v-if="tab !== 'all' && selectedDate"
        variant="ghost"
        size="sm"
        @click="selectedDate = ''"
      >
        返回最新
      </AppButton>
      <div class="flex-1" />
      <div class="flex gap-2">
        <AppButton
          variant="primary"
          :disabled="!canPlay"
          @click="playAll"
        >
          <LucidePlay class="size-4" fill="currentColor" />
          播放全部
        </AppButton>
        <AppButton
          :disabled="!canPlay"
          @click="addAllToPlaylist"
        >
          <LucideListMusic class="size-4" />
          添加全部
        </AppButton>
      </div>
    </div>

    <FilterChips
      v-model="productId"
      :options="productOptions"
      class="mb-4"
      role="group"
      aria-label="游戏筛选"
    />

    <AsyncFade>
      <PageLoading v-if="isPending || isFetching" />

      <div v-else-if="isError" class="flex flex-col items-center gap-3 py-20 text-gray-500 dark:text-gray-400" role="alert">
        <p>热榜加载失败</p>
        <AppButton @click="refetch()">
          重试
        </AppButton>
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

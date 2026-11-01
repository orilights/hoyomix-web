<script setup lang="ts">
import type { RankingPeriod } from '@/types/core'
import { useUrlSearchParams } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useRankingQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { t } from '@/i18n'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'

const player = usePlayerStore()
const store = useMainStore()

usePageSeo({
  title: () => t('DesktopSidebar.charts'),
  description: () => t('Ranking.popular_song_charts'),
  path: '/ranking',
})

const periods: { key: RankingPeriod, label: string }[] = [
  { key: '1d', get label() {
    return t('Ranking.daily')
  } },
  { key: '7d', get label() {
    return t('Ranking.weekly')
  } },
  { key: '30d', get label() {
    return t('ContributionRanking.monthly')
  } },
  { key: '365d', get label() {
    return t('ContributionRanking.yearly')
  } },
  { key: 'all', get label() {
    return t('ContributionRanking.all_time')
  } },
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
    { value: undefined, label: t('search.all') },
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
  toast.success(t('AlbumList.queue_replaced'))
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
  toast.success(addCount > 0 ? t('Playlist.added_song_to_queue', { p0: addCount }, Number(addCount)) : t('Playlist.all_songs_are_already_in_the_queue'))
}

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div>
    <PageHeader :title="t('DesktopSidebar.charts')" :subtitle="t('Home.see_what_everyone_is_listening_to')" />

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <SegmentSwitch
        v-model="tab"
        :options="periods"
      />
      <label v-if="tab !== 'all'" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">{{ t('Ranking.chart_date') }}<input
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
        {{ t('Ranking.back_to_latest') }}
      </AppButton>
      <div class="flex-1" />
      <div class="flex gap-2">
        <AppButton
          variant="primary"
          :disabled="!canPlay"
          @click="playAll"
        >
          <LucidePlay class="size-4" fill="currentColor" />{{ t('AlbumActions.play_all') }}
        </AppButton>
        <AppButton
          :disabled="!canPlay"
          @click="addAllToPlaylist"
        >
          <LucideListMusic class="size-4" />{{ t('Ranking.add_all') }}
        </AppButton>
      </div>
    </div>

    <FilterChips
      v-model="productId"
      :options="productOptions"
      class="mb-4"
      role="group"
      :aria-label="t('Ranking.filter_by_game')"
    />

    <AsyncFade>
      <PageLoading v-if="isPending || isFetching" />

      <div v-else-if="isError" class="flex flex-col items-center gap-3 py-20 text-gray-500 dark:text-gray-400" role="alert">
        <p>{{ t('Ranking.failed_to_load_charts') }}</p>
        <AppButton @click="refetch()">
          {{ t('App.retry') }}
        </AppButton>
      </div>

      <SongList
        v-else
        :songs="songs"
        show-cover
        show-album
        ranked
        :empty-text="t('MusicLyrics.no_data')"
      />
    </AsyncFade>
  </div>
</template>

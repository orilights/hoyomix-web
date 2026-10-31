<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { usePageSeo } from '@/composables/usePageSeo'
import { formatNumber, i18n, t } from '@/i18n'

import { useMainStore } from '@/store/main'
import { useThemeStore } from '@/store/theme'
import { formatDuration } from '@/utils'

const VChart = defineAsyncComponent(() =>
  import('@/utils/echarts').then(m => m.VChart),
)

const store = useMainStore()
const theme = useThemeStore()
const chartColors = computed(() => {
  // ECharts callbacks execute outside Vue's computed dependency collection.
  const locale = i18n.global.locale.value
  return theme.isDark
    ? { text: '#9ca3af', line: '#4b5563', grid: '#374151', surface: '#1f2937', foreground: '#f3f4f6', locale }
    : { text: '#9ca3af', line: '#e5e7eb', grid: '#f3f4f6', surface: '#ffffff', foreground: '#111827', locale }
})
const chartTooltip = computed(() => ({
  backgroundColor: chartColors.value.surface,
  borderColor: chartColors.value.line,
  textStyle: { color: chartColors.value.foreground },
}))
const { albumList } = storeToRefs(store)

usePageSeo({
  title: () => t('Statistics.statistics'),
  description: () => t('Statistics.music_collection_statistics'),
  path: '/statistics',
})

onMounted(() => {
  store.setBackground()
})

const totalAlbums = computed(() => albumList.value.length)

const totalSongs = computed(() =>
  albumList.value.reduce((acc, a) => acc + a.songCount, 0),
)

const totalDuration = computed(() =>
  albumList.value.reduce((acc, a) => acc + Number(a.totalDuration), 0),
)

const totalProducts = computed(() =>
  new Set(albumList.value.map(a => a.productName)).size,
)

interface YearStats {
  year: number
  albumCount: number
  songCount: number
  totalDuration: number
}

const yearStats = computed<YearStats[]>(() => {
  const map = new Map<number, YearStats>()
  for (const album of albumList.value) {
    const year = new Date(album.publishDate).getFullYear()
    const existing = map.get(year)
    if (existing) {
      existing.albumCount++
      existing.songCount += album.songCount
      existing.totalDuration += Number(album.totalDuration)
    }
    else {
      map.set(year, {
        year,
        albumCount: 1,
        songCount: album.songCount,
        totalDuration: Number(album.totalDuration),
      })
    }
  }
  return [...map.values()].sort((a, b) => a.year - b.year)
})

const years = computed(() => yearStats.value.map(s => String(s.year)))

const albumCountChartOption = computed<EChartsOption>(() => ({
  tooltip: {
    ...chartTooltip.value,
    trigger: 'axis',
    formatter: (params: any) => {
      const p = params[0]
      return t('Statistics.albums', { p0: p.name, p1: p.marker, p2: p.value })
    },
  },
  grid: { left: 40, right: 20, top: 20, bottom: 40 },
  xAxis: {
    type: 'category',
    data: years.value,
    axisLabel: { color: chartColors.value.text },
    axisLine: { lineStyle: { color: chartColors.value.line } },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: chartColors.value.text },
    splitLine: { lineStyle: { color: chartColors.value.grid } },
  },
  series: [
    {
      type: 'bar',
      data: yearStats.value.map(s => s.albumCount),
      itemStyle: { color: '#60a5fa', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

const durationChartOption = computed<EChartsOption>(() => ({
  tooltip: {
    ...chartTooltip.value,
    trigger: 'axis',
    formatter: (params: any) => {
      const year = params[0].name
      const countItem = params.find((p: any) => p.seriesIndex === 0)
      const durItem = params.find((p: any) => p.seriesIndex === 1)
      const mins = durItem ? Math.round((durItem.value as number) / 60) : 0
      return t('Statistics.songs_total_duration_minutes', { p0: year, p1: countItem?.marker ?? '', p2: countItem?.value ?? 0, p3: durItem?.marker ?? '', p4: mins })
    },
  },
  grid: { left: 44, right: 56, top: 20, bottom: 40 },
  xAxis: {
    type: 'category',
    data: years.value,
    axisLabel: { color: chartColors.value.text },
    axisLine: { lineStyle: { color: chartColors.value.line } },
  },
  yAxis: [
    {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#a78bfa' },
      splitLine: { lineStyle: { color: chartColors.value.grid } },
    },
    {
      type: 'value',
      axisLabel: {
        color: '#34d399',
        formatter: (v: number) => `${Math.round(v / 60)}m`,
      },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: t('Statistics.songs'),
      type: 'line',
      yAxisIndex: 0,
      data: yearStats.value.map(s => s.songCount),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#a78bfa' },
      lineStyle: { color: '#a78bfa', width: 2 },
    },
    {
      name: t('Album.total_duration'),
      type: 'line',
      yAxisIndex: 1,
      data: yearStats.value.map(s => s.totalDuration),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#34d399' },
      lineStyle: { color: '#34d399', width: 2 },
      areaStyle: { color: 'rgba(52,211,153,0.08)' },
    },
  ],
}))
</script>

<template>
  <div>
    <PageHeader :title="t('Statistics.statistics')" :subtitle="t('Statistics.an_overview_of_the_music_collection')" />

    <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-2">
      <div class="bg-black/5 dark:bg-white/5 rounded-xl p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('Home.total_albums') }}
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ formatNumber(totalAlbums) }}
        </div>
      </div>
      <div class="bg-black/5 dark:bg-white/5 rounded-xl p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('Home.total_songs') }}
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ formatNumber(totalSongs) }}
        </div>
      </div>
      <div class="bg-black/5 dark:bg-white/5 rounded-xl p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('Home.total_listening_time') }}
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ formatDuration(totalDuration) }}
        </div>
      </div>
      <div class="bg-black/5 dark:bg-white/5 rounded-xl p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('Home.games_covered') }}
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ formatNumber(totalProducts) }}
        </div>
      </div>
    </div>

    <div v-if="albumList.length" class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mt-4">
      <div class="bg-black/5 dark:bg-white/5 rounded-xl p-4">
        <div class="text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">
          {{ t('Statistics.albums_alternate') }}
        </div>
        <div class="w-full h-[200px] md:h-[250px]">
          <Suspense>
            <AsyncFade>
              <VChart class="w-full h-full" :option="albumCountChartOption" autoresize />
            </AsyncFade>
            <template #fallback>
              <AsyncFade>
                <div role="status" class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  <LucideLoader2 class="size-5 animate-spin mr-2" />{{ t('App.loading') }}
                </div>
              </AsyncFade>
            </template>
          </Suspense>
        </div>
      </div>
      <div class="bg-black/5 dark:bg-white/5 rounded-xl p-4">
        <div class="text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">
          {{ t('Statistics.songs_duration') }}
        </div>
        <div class="w-full h-[200px] md:h-[250px]">
          <Suspense>
            <AsyncFade>
              <VChart class="w-full h-full" :option="durationChartOption" autoresize />
            </AsyncFade>
            <template #fallback>
              <AsyncFade>
                <div role="status" class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  <LucideLoader2 class="size-5 animate-spin mr-2" />{{ t('App.loading') }}
                </div>
              </AsyncFade>
            </template>
          </Suspense>
        </div>
      </div>
    </div>

    <!-- 年份明细表格 -->
    <div v-if="albumList.length" class="mt-4 bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden">
      <div class="px-4 pt-4 pb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
        {{ t('Statistics.yearly_data') }}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 dark:text-gray-400">
              <th class="px-4 py-2 font-medium">
                {{ t('Artist.year') }}
              </th>
              <th class="px-4 py-2 font-medium">
                {{ t('Statistics.albums_alternate_618') }}
              </th>
              <th class="px-4 py-2 font-medium">
                {{ t('Statistics.songs') }}
              </th>
              <th class="px-4 py-2 font-medium">
                {{ t('Album.total_duration') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in [...yearStats].reverse()"
              :key="row.year"
              class="border-t border-black/5 dark:border-white/5"
            >
              <td class="px-4 py-2 font-medium">
                {{ row.year }}
              </td>
              <td class="px-4 py-2">
                {{ formatNumber(row.albumCount) }}
              </td>
              <td class="px-4 py-2">
                {{ formatNumber(row.songCount) }}
              </td>
              <td class="px-4 py-2">
                {{ formatDuration(row.totalDuration) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p v-if="!albumList.length" class="py-12 text-center text-gray-400">
      {{ t('Statistics.no_album_data') }}
    </p>
  </div>
</template>

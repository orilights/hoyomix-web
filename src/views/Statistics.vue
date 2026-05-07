<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { useMainStore } from '@/store/main'
import { formatDuration } from '@/utils'

const VChart = defineAsyncComponent(() =>
  import('@/utils/echarts').then(m => m.VChart),
)

const store = useMainStore()
const { albumList } = storeToRefs(store)

onMounted(() => {
  document.title = '数据统计 - HOYO-MiX Online'
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
    trigger: 'axis',
    formatter: (params: any) => {
      const p = params[0]
      return `${p.name}年<br/>${p.marker}专辑数：${p.value}`
    },
  },
  grid: { left: 40, right: 20, top: 20, bottom: 40 },
  xAxis: {
    type: 'category',
    data: years.value,
    axisLabel: { color: '#9ca3af' },
    axisLine: { lineStyle: { color: '#e5e7eb' } },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: '#9ca3af' },
    splitLine: { lineStyle: { color: '#f3f4f6' } },
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
    trigger: 'axis',
    formatter: (params: any) => {
      const year = params[0].name
      const countItem = params.find((p: any) => p.seriesIndex === 0)
      const durItem = params.find((p: any) => p.seriesIndex === 1)
      const mins = durItem ? Math.round((durItem.value as number) / 60) : 0
      return `${year}年<br/>${countItem?.marker ?? ''}歌曲数：${countItem?.value ?? 0}<br/>${durItem?.marker ?? ''}总时长：${mins} 分钟`
    },
  },
  grid: { left: 44, right: 56, top: 20, bottom: 40 },
  xAxis: {
    type: 'category',
    data: years.value,
    axisLabel: { color: '#9ca3af' },
    axisLine: { lineStyle: { color: '#e5e7eb' } },
  },
  yAxis: [
    {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#a78bfa' },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
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
      name: '歌曲数',
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
      name: '总时长',
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
    <div class="pb-4">
      <h1 class="text-2xl md:text-3xl font-bold">
        数据统计
      </h1>
      <p class="text-gray-500 text-sm mt-1">
        已收录音乐数据统计汇总
      </p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-2">
      <div class="bg-black/5 rounded-xl p-4">
        <div class="text-sm text-gray-500">
          专辑总数
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ totalAlbums }}
        </div>
      </div>
      <div class="bg-black/5 rounded-xl p-4">
        <div class="text-sm text-gray-500">
          歌曲总数
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ totalSongs }}
        </div>
      </div>
      <div class="bg-black/5 rounded-xl p-4">
        <div class="text-sm text-gray-500">
          歌曲总时长
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ formatDuration(totalDuration) }}
        </div>
      </div>
      <div class="bg-black/5 rounded-xl p-4">
        <div class="text-sm text-gray-500">
          覆盖游戏
        </div>
        <div class="text-2xl md:text-3xl font-bold mt-1">
          {{ totalProducts }}
        </div>
      </div>
    </div>

    <div v-if="albumList.length" class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mt-4">
      <div class="bg-black/5 rounded-xl p-4">
        <div class="text-sm font-medium mb-3 text-gray-600">
          专辑数量
        </div>
        <div class="w-full h-[200px] md:h-[250px]">
          <Suspense>
            <VChart class="w-full h-full" :option="albumCountChartOption" autoresize />
            <template #fallback>
              <div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                <LucideLoader2 class="size-5 animate-spin mr-2" />
                加载中...
              </div>
            </template>
          </Suspense>
        </div>
      </div>
      <div class="bg-black/5 rounded-xl p-4">
        <div class="text-sm font-medium mb-3 text-gray-600">
          歌曲数量/时长
        </div>
        <div class="w-full h-[200px] md:h-[250px]">
          <Suspense>
            <VChart class="w-full h-full" :option="durationChartOption" autoresize />
            <template #fallback>
              <div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                <LucideLoader2 class="size-5 animate-spin mr-2" />
                加载中...
              </div>
            </template>
          </Suspense>
        </div>
      </div>
    </div>

    <!-- 年份明细表格 -->
    <div v-if="albumList.length" class="mt-4 bg-black/5 rounded-xl overflow-hidden">
      <div class="px-4 pt-4 pb-2 text-sm font-medium text-gray-600">
        逐年数据
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500">
              <th class="px-4 py-2 font-medium">
                年份
              </th>
              <th class="px-4 py-2 font-medium">
                专辑数
              </th>
              <th class="px-4 py-2 font-medium">
                歌曲数
              </th>
              <th class="px-4 py-2 font-medium">
                总时长
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in [...yearStats].reverse()"
              :key="row.year"
              class="border-t border-black/5"
            >
              <td class="px-4 py-2 font-medium">
                {{ row.year }}
              </td>
              <td class="px-4 py-2">
                {{ row.albumCount }}
              </td>
              <td class="px-4 py-2">
                {{ row.songCount }}
              </td>
              <td class="px-4 py-2">
                {{ formatDuration(row.totalDuration) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!albumList.length" class="flex items-center justify-center py-20 text-gray-400">
      <LucideLoader2 class="size-6 animate-spin mr-2" />
      加载中...
    </div>
  </div>
</template>

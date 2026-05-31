<script setup lang="ts">
import { productMap } from '@/constants'
import { useMainStore } from '@/store/main'
import { formatDuration, getCoverUrl, getProductIconUrl } from '@/utils'

const store = useMainStore()
const { albumList } = storeToRefs(store)

const playlistScrollContainer = useTemplateRef('playlistScrollContainer')

const latestAlbums = computed(() =>
  [...albumList.value]
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 20),
)

const totalAlbums = computed(() => albumList.value.length)

const totalSongs = computed(() =>
  albumList.value.reduce((acc, a) => acc + a.songCount, 0),
)

const totalDuration = computed(() =>
  albumList.value.reduce((acc, a) => acc + Number(a.totalDuration), 0),
)

const products = computed(() => {
  const countMap = new Map<string, {
    albumCount: number
    songCount: number
  }>()
  for (const a of albumList.value) {
    const existing = countMap.get(a.productName)
    if (existing) {
      existing.albumCount++
      existing.songCount += a.songCount
    }
    else {
      countMap.set(a.productName, { albumCount: 1, songCount: a.songCount })
    }
  }
  return Object.values(productMap)
    .map(productName => ({
      productName,
      name: productName,
      songCount: countMap.get(productName),
    }))
})

const totalProducts = computed(() => products.value.length)

function handleWheel(event: WheelEvent) {
  const scrollbar = playlistScrollContainer.value?.getElement()
  const container = scrollbar?.querySelector('div[data-overlayscrollbars-contents]')
  if (container) {
    container.scrollLeft += event.deltaY
  }
}

onMounted(() => {
  document.title = 'HOYO-MiX Online'
  store.setBackground()
})
</script>

<template>
  <div class="overflow-hidden">
    <div>
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-bold text-2xl">
          最新专辑
        </h2>
        <RouterLink
          :to="{ name: 'Albums' }"
          class="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          查看全部
          <LucideChevronRight class="size-4" />
        </RouterLink>
      </div>

      <OverlayScrollbarsComponent
        ref="playlistScrollContainer"
        defer
        class="mt-2 w-full"
        :options="{
          overflow: { x: 'scroll', y: 'hidden' },
          scrollbars: { autoHide: 'move', autoHideDelay: 300 },
        }"
        @wheel.stop.prevent="handleWheel"
      >
        <div class="flex pb-3">
          <RouterLink
            v-for="album in latestAlbums"
            :key="album.id"
            :to="{ name: 'AlbumInfo', params: { id: album.id } }"
            :title="album.name"
            class="shrink-0 w-36 md:w-44"
          >
            <div class="group rounded-2xl p-3 hover:bg-gray-500/20 transition-colors">
              <div class="rounded-xl overflow-hidden">
                <CoverImage :src="getCoverUrl(album.platforms, '256px')" />
              </div>
              <div class="h-[42px] text-ellipsis text-sm mt-2 line-clamp-2">
                {{ album.name }}
              </div>
              <div>
                <span class="text-xs text-gray-500">{{ album.publishDate }}</span>
              </div>
            </div>
          </RouterLink>
        </div>
      </OverlayScrollbarsComponent>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-3">
      <RouterLink
        :to="{ name: 'Playlists' }"
        class="flex items-center gap-3 bg-black/5 hover:bg-black/10 transition-colors rounded-xl p-3"
      >
        <div class="px-3">
          <LucideListMusic class="size-6 text-gray-900" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900">
            歌单
          </div>
          <div class="text-sm text-gray-500 mt-0.5">
            发现和管理歌单
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'Random' }"
        class="flex items-center gap-3 bg-black/5 hover:bg-black/10 transition-colors rounded-xl p-3"
      >
        <div class="px-3">
          <LucideShuffle class="size-6 text-gray-900" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900">
            随机歌单
          </div>
          <div class="text-sm text-gray-500 mt-0.5">
            随机生成播放列表
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
    </div>

    <div class="mt-3">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-bold text-2xl">
          收录游戏
        </h2>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
        <RouterLink
          v-for="product in products"
          :key="product.productName"
          :to="{ name: 'ProductInfo', params: { name: product.productName } }"
          class="flex items-center gap-3 bg-black/5 hover:bg-black/10 transition-colors rounded-xl p-3"
        >
          <img :src="getProductIconUrl(product.productName)" class="size-12 rounded-full shadow" loading="lazy">
          <div class="min-w-0">
            <div class="font-medium truncate">
              {{ product.name }}
            </div>
            <div class="text-xs text-gray-500 mt-0.5">
              专辑 {{ product.songCount?.albumCount }} · 歌曲 {{ product.songCount?.songCount }}
            </div>
          </div>
        </RouterLink>
      </div>
    </div>

    <div class="mt-3">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-bold text-2xl">
          收录数据
        </h2>
        <RouterLink
          :to="{ name: 'Statistics' }"
          class="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          查看统计
          <LucideChevronRight class="size-4" />
        </RouterLink>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { getAppDescription } from '@/constants'
import { vPageEnter } from '@/directives/page-enter'
import { formatNumber, t } from '@/i18n'
import { useMainStore } from '@/store/main'
import { formatDuration, getCoverUrl, getProductIconUrl } from '@/utils'
import { getPublishDate } from '@/utils/time'

const store = useMainStore()
const { albumList, productList } = storeToRefs(store)

usePageSeo({
  title: () => t('DesktopSidebar.home'),
  description: getAppDescription,
  path: '/',
})

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
  return productList.value
    .map(product => ({
      productName: product.name,
      name: product.name,
      songCount: countMap.get(product.name),
    }))
    .sort((a, b) => (b.songCount?.songCount ?? 0) - (a.songCount?.songCount ?? 0))
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
  store.setBackground()
})
</script>

<template>
  <div class="overflow-hidden">
    <div v-page-enter="0" class="home-enter-block">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-bold text-2xl">
          {{ t('Home.latest_albums') }}
        </h2>
        <RouterLink
          :to="{ name: 'Albums' }"
          class="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 hover:dark:text-blue-400 transition-colors"
        >
          {{ t('AlbumSeriesHoverCard.view_all') }}<LucideChevronRight class="size-4" />
        </RouterLink>
      </div>

      <OverlayScrollbarsComponent
        ref="playlistScrollContainer"
        defer
        class="mt-2 w-full"
        :options="{
          overflow: { x: 'scroll', y: 'hidden' },
          scrollbars: { theme: 'os-theme-custom', autoHide: 'move', autoHideDelay: 300 },
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
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ getPublishDate(album.publishDate) }}</span>
              </div>
            </div>
          </RouterLink>
        </div>
      </OverlayScrollbarsComponent>
    </div>

    <div v-page-enter="120" class="home-enter-block mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
      <RouterLink
        :to="{ name: 'Playlists' }"
        class="flex items-center gap-2 md:gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
      >
        <div class="px-2 md:px-3">
          <LucideListMusic class="size-5 md:size-6 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-gray-100">
            {{ t('Home.playlists') }}
          </div>
          <div class="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ t('Home.discover_and_manage_playlists') }}
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'Random' }"
        class="flex items-center gap-2 md:gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
      >
        <div class="px-2 md:px-3">
          <LucideShuffle class="size-5 md:size-6 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-gray-100">
            {{ t('DesktopSidebar.shuffle') }}
          </div>
          <div class="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ t('Home.generate_a_random_queue') }}
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'Regions' }"
        class="flex items-center gap-2 md:gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
      >
        <div class="px-2 md:px-3">
          <LucideMapPin class="size-5 md:size-6 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-gray-100">
            {{ t('DesktopSidebar.regions') }}
          </div>
          <div class="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ t('Home.find_songs_by_region') }}
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'SongTags' }"
        class="flex items-center gap-2 md:gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
      >
        <div class="px-2 md:px-3">
          <LucideTags class="size-5 md:size-6 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-gray-100">
            {{ t('DesktopSidebar.tags') }}
          </div>
          <div class="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ t('Home.find_songs_by_tag') }}
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'Ranking' }"
        class="flex items-center gap-2 md:gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
      >
        <div class="px-2 md:px-3">
          <LucideTrendingUp class="size-5 md:size-6 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-gray-100">
            {{ t('DesktopSidebar.charts') }}
          </div>
          <div class="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ t('Home.see_what_everyone_is_listening_to') }}
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'ContributionRanking' }"
        class="flex items-center gap-2 md:gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
      >
        <div class="px-2 md:px-3">
          <LucideTrophy class="size-5 md:size-6 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-gray-100">
            {{ t('DesktopSidebar.contributors') }}
          </div>
          <div class="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ t('ContributionRanking.database_contributors') }}
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'Feedback' }"
        class="flex items-center gap-2 md:gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
      >
        <div class="px-2 md:px-3">
          <LucideMessageSquare class="size-5 md:size-6 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-gray-100">
            {{ t('DesktopSidebar.feedback') }}
          </div>
          <div class="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ t('Home.issues_and_suggestions') }}
          </div>
        </div>
        <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
      </RouterLink>
    </div>

    <div v-page-enter="240" class="home-enter-block mt-3">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-bold text-2xl">
          {{ t('Home.games_in_the_collection') }}
        </h2>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
        <RouterLink
          v-for="product in products"
          :key="product.productName"
          :to="{ name: 'ProductInfo', params: { name: product.productName } }"
          class="flex items-center gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors rounded-xl p-3"
        >
          <LazyImg class="size-12 rounded-full shadow" :src="getProductIconUrl(product.productName)" />
          <div class="min-w-0">
            <div class="font-medium truncate">
              {{ product.name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ t('Home.albums_songs', { p0: product.songCount?.albumCount, p1: product.songCount?.songCount }) }}
            </div>
          </div>
        </RouterLink>
      </div>
    </div>

    <div v-page-enter="360" class="home-enter-block mt-3">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-bold text-2xl">
          {{ t('Home.collection_statistics') }}
        </h2>
        <RouterLink
          :to="{ name: 'Statistics' }"
          class="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 hover:dark:text-blue-400 transition-colors"
        >
          {{ t('Home.view_statistics') }}<LucideChevronRight class="size-4" />
        </RouterLink>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 mt-2">
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
    </div>
  </div>
</template>

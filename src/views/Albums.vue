<script setup lang="ts">
import { useAlbumFavoritesQuery, useAlbumListQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

const store = useMainStore()
const { albumList, productList } = storeToRefs(store)
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const filter = computed({
  get: () => route.query.filter === 'favorites' ? 'favorites' : 'all',
  set: (value: string) => {
    void router.push({ query: { ...route.query, filter: value === 'favorites' ? 'favorites' : undefined } })
  },
})
const filterOptions = [{ key: 'all', get label() {
  return t('search.all')
} }, { key: 'favorites', get label() {
  return t('Albums.saved')
} }]
const { isPending, isError, refetch } = useAlbumFavoritesQuery()
const albumsQuery = useAlbumListQuery()
const selectedProduct = ref<string | null>(null)
const selectedYear = ref<number | null>(null)
const productOptions = computed(() => [
  { value: null, label: t('search.all') },
  ...productList.value.map(product => ({ value: product.name, label: product.name })),
])
const yearOptions = computed(() => [
  { value: null, label: t('search.all') },
  ...[...new Set(albumList.value.map(album => new Date(album.publishDate).getFullYear()))]
    .filter(Number.isFinite)
    .sort((a, b) => b - a)
    .map(year => ({ value: year, label: String(year) })),
])
const sourceAlbums = computed(() => filter.value === 'favorites'
  ? albumList.value.filter(album => store.favoriteAlbumIds.includes(album.id))
  : albumList.value)
const visibleAlbums = computed(() => sourceAlbums.value.filter(album =>
  (selectedProduct.value === null || album.productName === selectedProduct.value)
  && (selectedYear.value === null || new Date(album.publishDate).getFullYear() === selectedYear.value),
))
const revealKey = computed(() => JSON.stringify([filter.value, selectedProduct.value, selectedYear.value]))
const showFavorites = computed(() => filter.value === 'favorites')
const canShowFavorites = computed(() => auth.isLoggedIn && !isPending.value && !isError.value && !albumsQuery.isPending.value && !albumsQuery.isError.value)

function retry() {
  void refetch()
  void albumsQuery.refetch()
}

usePageSeo({
  title: () => t('DesktopSidebar.all_albums'),
  description: () => t('Albums.all_albums_in_the_collection'),
  path: '/albums',
})

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div>
    <PageHeader :title="t('DesktopSidebar.all_albums')" :subtitle="t('Albums.all_albums_in_the_collection')" />

    <AlbumList :albums-list="showFavorites && !canShowFavorites ? [] : visibleAlbums" :reveal-key="revealKey" display-by-year persist-key="albums">
      <template #toolbar>
        <SegmentSwitch v-model="filter" :options="filterOptions" :aria-label="t('Albums.album_filters')" />
      </template>
      <template #filters>
        <section class="mb-4 space-y-3">
          <div>
            <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {{ t('search.game') }}
            </h2>
            <FilterChips v-model="selectedProduct" :options="productOptions" :aria-label="t('Ranking.filter_by_game')" />
          </div>
          <div>
            <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {{ t('Albums.release_year') }}
            </h2>
            <FilterChips v-model="selectedYear" :options="yearOptions" :aria-label="t('Albums.filter_by_release_year')" />
          </div>
        </section>
      </template>
      <template #empty>
        <div v-if="showFavorites && (!canShowFavorites || !visibleAlbums.length)" class="text-center py-12 text-gray-500 dark:text-gray-400">
          <AsyncFade>
            <div v-if="!auth.isLoggedIn && !auth.isPending">
              <p class="mb-3">
                {{ t('Albums.sign_in_to_view_saved_albums') }}
              </p>
              <AppButton @click="auth.openAuthDialog()">
                {{ t('DesktopSidebar.sign_in') }}
              </AppButton>
            </div>
            <PageLoading v-else-if="auth.isPending || isPending || albumsQuery.isPending.value" />
            <div v-else-if="isError || albumsQuery.isError.value">
              <p class="mb-3">
                {{ t('Albums.failed_to_load_saved_albums') }}
              </p>
              <AppButton @click="retry">
                {{ t('App.retry') }}
              </AppButton>
            </div>
            <p v-else>
              {{ t(sourceAlbums.length ? 'Product.no_matching_albums' : 'Albums.no_saved_albums') }}
            </p>
          </AsyncFade>
        </div>
        <div v-else-if="!albumsQuery.isPending.value && !albumsQuery.isError.value" role="status" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ t('Product.no_matching_albums') }}
        </div>
      </template>
    </AlbumList>
  </div>
</template>

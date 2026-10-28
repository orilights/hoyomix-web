<script setup lang="ts">
import { useAlbumFavoritesQuery, useAlbumListQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

const store = useMainStore()
const { albumList } = storeToRefs(store)
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const filter = computed({
  get: () => route.query.filter === 'favorites' ? 'favorites' : 'all',
  set: (value: string) => {
    void router.push({ query: { ...route.query, filter: value === 'favorites' ? 'favorites' : undefined } })
  },
})
const filterOptions = [{ key: 'all', label: '全部' }, { key: 'favorites', label: '已收藏' }]
const { isPending, isError, refetch } = useAlbumFavoritesQuery()
const albumsQuery = useAlbumListQuery()
const visibleAlbums = computed(() => filter.value === 'favorites'
  ? albumList.value.filter(album => store.favoriteAlbumIds.includes(album.id))
  : albumList.value)
const showFavorites = computed(() => filter.value === 'favorites')
const canShowFavorites = computed(() => auth.isLoggedIn && !isPending.value && !isError.value && !albumsQuery.isPending.value && !albumsQuery.isError.value)

function retry() {
  void refetch()
  void albumsQuery.refetch()
}

usePageSeo({
  title: '全部专辑',
  description: '已收录的所有专辑',
  path: '/albums',
})

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div>
    <PageHeader title="全部专辑" subtitle="已收录的所有专辑" />

    <AlbumList :albums-list="showFavorites && !canShowFavorites ? [] : visibleAlbums" display-by-year persist-key="albums">
      <template #toolbar>
        <SegmentSwitch v-model="filter" :options="filterOptions" aria-label="专辑筛选" />
      </template>
    </AlbumList>
    <div v-if="showFavorites && (!canShowFavorites || !visibleAlbums.length)" class="text-center py-12 text-gray-500 dark:text-gray-400">
      <template v-if="!auth.isLoggedIn && !auth.isPending">
        <p class="mb-3">
          请先登录以查看收藏专辑
        </p>
        <AppButton @click="auth.openAuthDialog()">
          登录
        </AppButton>
      </template>
      <PageLoading v-else-if="auth.isPending || isPending || albumsQuery.isPending.value" />
      <template v-else-if="isError || albumsQuery.isError.value">
        <p class="mb-3">
          收藏专辑加载失败
        </p>
        <AppButton @click="retry">
          重试
        </AppButton>
      </template>
      <p v-else-if="!visibleAlbums.length">
        暂无收藏专辑
      </p>
    </div>
  </div>
</template>

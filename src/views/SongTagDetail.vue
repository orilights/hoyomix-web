<script setup lang="ts">
import type { SongTagSongsParams } from '@/types/song-tag'
import { useSongTagQuery, useSongTagSongsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { useMainStore } from '@/store/main'
import { NotFoundError } from '@/utils/fetch'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const code = computed(() => String(route.params.code))
const page = computed(() => typeof route.query.page === 'string' && /^[1-9]\d*$/.test(route.query.page) ? Math.min(100000, Number(route.query.page)) : 1)
const productId = computed(() => store.productList.some(product => product.productId === Number(route.query.productId)) ? Number(route.query.productId) : undefined)
const sort = computed(() => route.query.sort === 'album_asc' ? 'album_asc' : 'album_desc')
const params = computed<SongTagSongsParams>(() => ({ page: page.value, productId: productId.value, sort: sort.value }))
const tagQuery = useSongTagQuery(code)
const { data, isPending, isFetching, isError, refetch } = useSongTagSongsQuery(code, params)
const products = computed(() => store.productList
  .map((product, index) => ({
    ...product,
    index,
    count: store.albumList
      .filter(album => album.productName === product.name)
      .reduce((sum, album) => sum + album.songCount, 0),
  }))
  .sort((a, b) => b.count - a.count || a.index - b.index))
function updateQuery(patch: Record<string, string | undefined>) {
  void router.push({ query: { ...route.query, page: undefined, ...patch } })
}
watch(data, (value) => {
  if (!value || value.page !== page.value)
    return
  const last = Math.max(1, Math.ceil(value.total / 50))
  if (page.value > last)
    updateQuery({ page: last > 1 ? String(last) : undefined })
})
registerSongList({ songIds: computed(() => data.value?.items.map(song => song.songId) ?? []) })
usePageSeo({ title: computed(() => tagQuery.data.value?.name ?? '歌曲标签'), path: computed(() => `/tags/${encodeURIComponent(code.value)}`) })
onMounted(() => store.setBackground())
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-4">
    <RouterLink :to="{ name: 'SongTags' }" class="text-sm text-blue-500">
      全部标签
    </RouterLink>
    <PageHeader :title="tagQuery.data.value?.name ?? '歌曲标签'" />
    <p v-if="tagQuery.data.value?.description" class="text-sm text-gray-500 dark:text-gray-400">
      {{ tagQuery.data.value.description }}
    </p>
    <p v-if="tagQuery.data.value && !tagQuery.data.value.enabled" class="text-xs text-gray-400">
      已停用
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2 text-sm">
        <span>游戏</span>
        <AppSelect
          :model-value="productId ?? ''"
          :options="[{ value: '', label: '全部游戏' }, ...products.map(product => ({ value: product.productId, label: product.name }))]"
          aria-label="游戏"
          class="max-w-52"
          @update:model-value="updateQuery({ productId: String($event) || undefined })"
        />
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span>排序</span>
        <AppSelect
          :model-value="sort"
          :options="[{ value: 'album_desc', label: '专辑发布时间降序' }, { value: 'album_asc', label: '专辑发布时间升序' }]"
          aria-label="排序"
          @update:model-value="updateQuery({ sort: String($event) })"
        />
      </div>
      <span v-if="data" class="text-sm text-gray-400">{{ data.total }} 首歌曲</span>
    </div>
    <AsyncFade>
      <PageLoading v-if="isPending || tagQuery.isPending.value" />
      <div v-else-if="isError || tagQuery.isError.value" class="text-center py-16 space-y-3">
        <p class="text-red-400">
          {{ tagQuery.error.value instanceof NotFoundError ? '标签不存在' : '标签或歌曲加载失败' }}
        </p>
        <AppButton v-if="!(tagQuery.error.value instanceof NotFoundError)" @click="refetch(); tagQuery.refetch()">
          重试
        </AppButton>
      </div>
      <SongList v-else :songs="data?.items ?? []" show-cover show-album />
    </AsyncFade>
    <Pagination
      v-if="data && data.total > 50"
      :model-value="page"
      :total-pages="Math.ceil(data.total / 50)"
      :disabled="isFetching || tagQuery.isFetching.value"
      aria-label="标签歌曲分页"
      class="justify-center mt-5"
      @update:model-value="updateQuery({ page: $event > 1 ? String($event) : undefined })"
    />
  </div>
</template>

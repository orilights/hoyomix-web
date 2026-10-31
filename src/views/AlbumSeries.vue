<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useTagAlbumsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { useMainStore } from '@/store/main'
import { getProductIconUrl } from '@/utils'

const route = useRoute()
const store = useMainStore()

const seriesName = computed(() => route.params.seriesName as string || null)

const productName = computed(() => seriesName.value?.split('-')[0] ?? '')

const { data: albums, isLoading, isError, error } = useTagAlbumsQuery('series', seriesName)

usePageSeo({
  title: computed(() => (seriesName.value ? t('AlbumSeriesHoverCard.album_series', { p0: seriesName.value }) : null)),
  description: computed(() => (seriesName.value ? t('AlbumSeriesHoverCard.album_series', { p0: seriesName.value }) : null)),
  path: computed(() => (seriesName.value ? `/album/series/${seriesName.value}` : null)),
})

watch(isError, (val) => {
  if (val)
    toast.error(t('AlbumSeries.failed_to_load_album_series', { p0: error.value?.message ?? t('App.unknown_error') }))
})

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <AsyncFade>
    <PageLoading v-if="isLoading" />

    <div v-else-if="isError" class="flex items-center justify-center py-20 text-red-400">
      {{ t('ArtistListByType.unable_to_load_refresh_to_try_again') }}
    </div>

    <div v-else class="flex flex-col lg:flex-row gap-4 mt-4">
      <div class="w-full lg:w-[400px] h-fit p-4 bg-black/5 dark:bg-white/5 rounded-xl shrink-0">
        <div class="font-bold text-2xl pb-4 break-words">
          {{ seriesName }}
          <div class="font-normal text-base text-gray-500 dark:text-gray-400">
            {{ t('AlbumSeries.series_albums') }}
          </div>
        </div>
        <RouterLink
          :to="{ name: 'ProductInfo', params: { name: productName } }"
          class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors w-fit"
        >
          <LazyImg
            class="size-[20px] rounded-lg"
            :src="getProductIconUrl(productName)"
            :alt="productName"
          />
          <span class="ml-2">{{ productName }}</span>
        </RouterLink>
      </div>

      <div class="flex-1 min-w-0">
        <AlbumList :albums-list="albums ?? []" persist-key="albums-series" default-layout="list" />
      </div>
    </div>
  </AsyncFade>
</template>

<style scoped>

</style>

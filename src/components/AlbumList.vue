<script setup lang="ts">
import type { ExportAlbumListItem } from '@/types/export'
import { useElementSize } from '@vueuse/core'
import { getCoverUrl, getProductName } from '@/utils'

const props = withDefaults(defineProps<{
  albumsList: ExportAlbumListItem[]
  displayByYear?: boolean
}>(), {
  displayByYear: false,
})

const homeContainer = useTemplateRef<HTMLElement>('homeContainer')
const { width: containerWidth } = useElementSize(homeContainer)

const selectedProduct = ref<string | null>(null)

const uniqueProducts = computed(() => {
  const products = new Set<string>()
  for (const album of props.albumsList) {
    products.add(album.productName)
  }
  return [...products]
})

const filteredAlbums = computed(() => {
  if (!selectedProduct.value) {
    return props.albumsList
  }
  return props.albumsList.filter(album => album.productName === selectedProduct.value)
})

const years = computed(() => {
  if (!props.displayByYear) {
    return [0]
  }
  const yearSet = new Set<number>()
  for (const album of filteredAlbums.value) {
    yearSet.add(getAlbumYear(album))
  }
  return [...yearSet].sort((a, b) => b - a)
})
const gridColumns = computed(() => {
  const num = Math.floor(containerWidth.value / 200)
  if (num < 2)
    return 2
  return num
})

function getAlbumYear(album: ExportAlbumListItem) {
  return new Date(album.publishDate).getFullYear()
}

watch(uniqueProducts, (products) => {
  if (selectedProduct.value && !products.includes(selectedProduct.value)) {
    selectedProduct.value = null
  }
})
</script>

<template>
  <div ref="homeContainer">
    <div v-if="uniqueProducts.length > 1" class="flex flex-wrap gap-2 px-4 pt-4">
      <button
        class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        :class="selectedProduct === null ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="selectedProduct = null"
      >
        全部
      </button>
      <button
        v-for="product in uniqueProducts"
        :key="product"
        class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        :class="selectedProduct === product ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="selectedProduct = product"
      >
        {{ getProductName(product) }}
      </button>
    </div>
    <div v-for="year in years" :key="year">
      <div v-if="year" class="font-bold text-4xl pt-4 pb-2 pl-4">
        {{ year }}
      </div>
      <div
        class="grid justify-center"
        :style="{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0px, 1fr))`,
        }"
      >
        <RouterLink
          v-for="album_info in filteredAlbums.filter(i => year === 0 || getAlbumYear(i) === year)" :key="album_info.id"
          :to="{ name: 'AlbumInfo', params: { id: album_info.id } }" :title="album_info.name"
        >
          <div class="p-4 rounded-2xl hover:bg-gray-500/20 transition-colors">
            <div class="rounded-2xl overflow-hidden">
              <CoverImage :src="getCoverUrl(album_info.platforms, '256px')" />
            </div>
            <div class="h-[42px] text-ellipsis text-sm mt-2 line-clamp-2">
              {{ album_info.name }}
            </div>
            <div>
              <span class="text-xs text-gray-500">{{ album_info.publishDate }}</span>
              ·
              <span class="text-xs text-gray-500">{{ album_info.songCount }}</span>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style>
.square {
    overflow: hidden;
}

.square::after {
    content: '';
    display: block;
    margin-top: 100%;
}
</style>

<script setup lang="ts">
import { useStore } from '@/store'
import { getCoverUrl, getProductIconUrl, getProductName } from '@/utils'

const route = useRoute()
const store = useStore()

const product = computed(() => route.params.name as string)

const { albumList } = storeToRefs(store)

const albumsFiltered = computed(() => {
  return albumList.value.filter(i => i.productName === product.value)
})

function sumBy(arr: any[], getValue: (x: any) => any) {
  return arr.reduce((acc, cur) => acc + getValue(cur), 0)
}
watch(product, (val) => {
  if (val) {
    document.title = `${getProductName(val)} - HOYO-MiX Online`

    store.setBackground(getCoverUrl(albumsFiltered.value[0].platforms, '200px'))
  }
}, { immediate: true })
</script>

<template>
  <div class="py-4 flex items-center">
    <img :src="getProductIconUrl(product)" class="rounded-full shadow">
    <div class="ml-8">
      <div class="font-bold text-3xl">
        {{ product }}
      </div>
      <div class="mt-6">
        <span class="text-gray-500">
          专辑
        </span>
        <span>
          {{ albumsFiltered.length }}
        </span>
        <span class="ml-4 text-gray-500">
          音乐
        </span>
        <span>
          {{ sumBy(albumsFiltered, (i) => i.songCount) }}
        </span>
      </div>
    </div>
  </div>

  <div class="flex gap-4 mt-4">
    <div class="w-[400px] shrink-0 p-4 bg-black/5 rounded-xl">
      <ArtistListByType :id="product" type="product" />
    </div>

    <div class="flex-1">
      <AlbumList :albums-list="albumsFiltered" />
    </div>
  </div>
</template>

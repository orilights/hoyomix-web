<script setup lang="ts">
import { productMap } from '@/constants'
import { useStore } from '@/store'
import { getProductIconUrl, getProductName } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { albums } = toRefs(store)

const product = computed(() => route.params.name as string)

const albumsFiltered = computed(() => albums.value.filter(album => album.product === product.value))

function sumBy(arr: any[], getValue: (x: any) => any) {
  return arr.reduce((acc, cur) => acc + getValue(cur), 0)
}
watch(product, (val) => {
  if (val) {
    if (!Object.keys(productMap).includes(val)) {
      router.replace({ name: 'Home' })
      return
    }
    document.title = `${getProductName(val)} - HOYO-MiX Online`
    // store.setBackground(getCoverUrl('netease', albumsFiltered.value[0]!.netease.coverPicId, '200px'))
  }
}, { immediate: true })
</script>

<template>
  <div class="py-4 flex items-center">
    <img :src="getProductIconUrl(product)" class="rounded-full shadow">
    <div class="ml-8">
      <div class="font-bold text-3xl">
        {{ getProductName(product) }}
      </div>
      <div class="text-xl mt-2">
        <span>专辑 {{ albumsFiltered.length }}</span>
        <span class="ml-4">音乐 {{ sumBy(albumsFiltered, (i) => i.size) }}</span>
      </div>
    </div>
  </div>

  <div class="flex gap-4 mt-4">
    <div class="w-[400px] shrink-0 p-2 bg-black/5 rounded-xl">
      <!-- <ArtistListByType :albums="albumsFiltered"  /> -->
    </div>

    <!-- <div class="flex-1">
      <AlbumList :albums-list="albumsFiltered" />
    </div> -->
  </div>
</template>

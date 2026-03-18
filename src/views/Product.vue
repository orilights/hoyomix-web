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

const activeTab = ref<'albums' | 'artists'>('albums')

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
    <div class="ml-4 md:ml-8">
      <div class="font-bold text-2xl md:text-3xl">
        {{ product }}
      </div>
      <div class="mt-2 md:mt-6">
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

  <div class="flex gap-2 mt-2 md:hidden">
    <button
      class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
      :class="activeTab === 'albums' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
      @click="activeTab = 'albums'"
    >
      专辑列表
    </button>
    <button
      class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
      :class="activeTab === 'artists' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
      @click="activeTab = 'artists'"
    >
      制作人员
    </button>
  </div>

  <div class="flex flex-col md:flex-row gap-4 mt-2 md:mt-4">
    <div v-show="activeTab === 'artists'" class="w-full md:w-[400px] shrink-0 p-4 bg-black/5 rounded-xl md:!block" :class="{ hidden: activeTab !== 'artists' }">
      <ArtistListByType :id="product" type="product" />
    </div>

    <div v-show="activeTab === 'albums'" class="flex-1 md:!block" :class="{ hidden: activeTab !== 'albums' }">
      <AlbumList :albums-list="albumsFiltered" />
    </div>
  </div>
</template>

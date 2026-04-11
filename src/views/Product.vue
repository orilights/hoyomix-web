<script setup lang="ts">
import { useStore } from '@/store'
import { formatDuration, getCoverUrl, getProductIconUrl, getProductName } from '@/utils'

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

// 年份筛选
const selectedYear = ref<number | null>(null)

const availableYears = computed(() => {
  const set = new Set<number>()
  for (const album of albumsFiltered.value) {
    set.add(new Date(album.publishDate).getFullYear())
  }
  return [...set].sort((a, b) => b - a)
})

const albumsFilteredByYear = computed(() => {
  if (selectedYear.value === null)
    return albumsFiltered.value
  return albumsFiltered.value.filter(
    a => new Date(a.publishDate).getFullYear() === selectedYear.value,
  )
})

// 切换产品时重置年份筛选
watch(product, () => {
  selectedYear.value = null
})

const activeTab = ref<'albums' | 'artists'>('albums')

watch(product, (val) => {
  if (val) {
    document.title = `${getProductName(val)} - HOYO-MiX Online`

    store.setBackground(getCoverUrl(albumsFiltered.value[0].platforms, '128px'))
  }
}, { immediate: true })
</script>

<template>
  <div>
    <div class="py-4 flex items-center">
      <img :src="getProductIconUrl(product)" class="rounded-full shadow">
      <div class="ml-4 md:ml-8">
        <div class="font-bold text-2xl md:text-3xl">
          {{ getProductName(product) }}
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
          <span class="ml-4 text-gray-500">
            时长
          </span>
          <span>
            {{ formatDuration(sumBy(albumsFiltered, (i) => Number(i.totalDuration))) }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex gap-2 mt-4 lg:hidden h-fit">
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

    <div class="flex flex-col lg:flex-row gap-4 mt-4">
      <div v-show="activeTab === 'artists'" class="w-full lg:w-[400px] shrink-0 p-4 bg-black/5 rounded-xl lg:!block" :class="{ hidden: activeTab !== 'artists' }">
        <ArtistListByType :id="product" type="product" />
      </div>

      <div v-show="activeTab === 'albums'" class="flex-1 lg:!block overflow-hidden" :class="{ hidden: activeTab !== 'albums' }">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <button
            class="text-sm px-3 py-1 rounded-lg transition-colors cursor-pointer"
            :class="selectedYear === null ? 'bg-blue-500/90 text-white' : 'bg-black/5 hover:bg-black/10'"
            @click="selectedYear = null"
          >
            全部
          </button>
          <button
            v-for="year in availableYears"
            :key="year"
            class="text-sm px-3 py-1 rounded-lg transition-colors cursor-pointer"
            :class="selectedYear === year ? 'bg-blue-500/90 text-white' : 'bg-black/5 hover:bg-black/10'"
            @click="selectedYear = year"
          >
            {{ year }}
          </button>
        </div>

        <AlbumList default-layout="list" :albums-list="albumsFilteredByYear" persist-key="product">
          <template #toolbar>
            <span class="text-sm text-gray-400 pl-1">
              专辑 {{ albumsFilteredByYear.length }} · 歌曲 {{ sumBy(albumsFilteredByYear, (i) => i.songCount) }} · 时长 {{ formatDuration(sumBy(albumsFilteredByYear, (i) => Number(i.totalDuration))) }}
            </span>
          </template>
        </AlbumList>
      </div>
    </div>
  </div>
</template>

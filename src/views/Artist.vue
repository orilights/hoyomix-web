<script setup lang="ts">
import type { ArtistInfo } from '@/types/core'
import { toast } from 'vue-sonner'
import { NotFoundError } from '@/api/music'
import { useArtistInfoQuery } from '@/composables/queries'
import { appTitle } from '@/constants'
import { useMainStore } from '@/store/main'
import { getProductIconUrl } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useMainStore()

const { albumList } = storeToRefs(store)

const artistName = computed(() => route.params.name as string || null)

const { data: artistInfo, isLoading, isError, error } = useArtistInfoQuery(artistName)

watch(isError, (val) => {
  if (!val)
    return
  if (error.value instanceof NotFoundError)
    router.replace({ path: '/404', query: { errorMessage: error.value?.message } })
  else
    toast.error(`艺术家信息加载失败：${error.value?.message ?? '未知错误'}`)
})

const albumsFiltered = computed(() => {
  if (artistInfo.value) {
    return albumList.value.filter(album => (artistInfo.value as ArtistInfo).albums.find(i => i.id === album.id))
  }
  return []
})

const artistInfoResolved = computed(() => artistInfo.value as ArtistInfo | undefined)

const selectedRole = ref<string | null>(null)
const selectedProduct = ref<string | null>(null)
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

const productSongCount = computed(() => {
  if (!artistInfoResolved.value)
    return new Map<string, number>()
  const map = new Map<string, number>()
  for (const song of artistInfoResolved.value.songs) {
    map.set(song.productName, (map.get(song.productName) ?? 0) + 1)
  }
  return map
})

const allRoles = computed(() => {
  if (!artistInfoResolved.value)
    return []
  const songs = selectedProduct.value
    ? artistInfoResolved.value.songs.filter(s => s.productName === selectedProduct.value)
    : artistInfoResolved.value.songs
  const map = new Map<string, number>()
  for (const song of songs) {
    for (const role of song.roles) {
      map.set(role, (map.get(role) ?? 0) + 1)
    }
  }
  return Array.from(map.entries(), ([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
})

watch(artistName, (val) => {
  if (val)
    document.title = `${val} - ${appTitle}`
  selectedRole.value = null
  selectedProduct.value = null
  selectedYear.value = null
}, { immediate: true })

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center py-20 text-gray-400">
    <LucideLoader2 class="size-6 animate-spin mr-2" />
    加载中...
  </div>

  <div v-else-if="isError" class="flex items-center justify-center py-20 text-red-400">
    加载失败，请刷新重试
  </div>

  <div v-else class="flex flex-col lg:flex-row gap-4 mt-4">
    <div class="w-full lg:w-[400px] shrink-0 h-fit p-4 bg-black/5 rounded-xl">
      <div class="font-bold text-2xl pb-4">
        {{ artistName }}
        <div v-if="artistInfo?.isHoyomix" class="font-normal text-base text-gray-500">
          HOYO-MiX 成员
        </div>
      </div>
      <div class="font-bold mt-2 mb-1">
        参与项目
      </div>
      <div v-if="artistInfo" class="flex flex-col gap-0.5">
        <button
          v-for="product in artistInfo.products" :key="product"
          class="flex items-center px-2 py-1.5 rounded-lg transition-colors cursor-pointer text-left"
          :class="selectedProduct === product ? 'bg-black/10 font-medium' : 'hover:bg-gray-500/15'"
          @click="selectedProduct = selectedProduct === product ? null : product; selectedRole = null"
        >
          <img
            class="size-[20px] rounded-lg shrink-0"
            :src="getProductIconUrl(product)"
            :alt="product"
          >
          <span class="ml-2 text-sm truncate flex-1">{{ product }}</span>
          <span class="text-xs text-gray-400 shrink-0 ml-2">{{ productSongCount.get(product) ?? 0 }}</span>
        </button>
      </div>

      <template v-if="allRoles.length">
        <div class="font-bold mt-4 mb-1">
          担任职责
        </div>
        <div class="flex flex-col gap-0.5">
          <button
            v-for="item in allRoles" :key="item.role"
            class="flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer text-left"
            :class="selectedRole === item.role ? 'bg-black/10 font-medium' : 'hover:bg-gray-500/15'"
            @click="selectedRole = selectedRole === item.role ? null : item.role"
          >
            <span class="text-sm truncate mr-2">{{ item.role }}</span>
            <span class="text-xs text-gray-400 shrink-0">{{ item.count }}</span>
          </button>
        </div>
      </template>
    </div>

    <div class="flex-1 overflow-hidden">
      <div v-if="availableYears.length > 1" class="flex flex-wrap items-center gap-2 mb-2">
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
      <ArtistAlbumList v-if="artistInfoResolved" :albums-list="albumsFilteredByYear" :artist-info="artistInfoResolved" :selected-role="selectedRole" :selected-product="selectedProduct" />
    </div>
  </div>
</template>

<style scoped>

</style>

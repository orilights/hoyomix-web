<script setup lang="ts">
import type { ArtistInfo } from '@/types/export'
import { toast } from 'vue-sonner'
import { useArtistInfoQuery } from '@/composables/queries'
import { useStore } from '@/store'
import { getProductIconUrl } from '@/utils'

const route = useRoute()
const store = useStore()

const { albumList } = storeToRefs(store)

const artistName = computed(() => route.params.name as string || null)

const { data: artistInfo, isLoading, isError } = useArtistInfoQuery(artistName)

watch(isError, (val) => {
  if (val)
    toast.error('艺术家信息加载失败')
})

const albumsFiltered = computed(() => {
  if (artistInfo.value) {
    return albumList.value.filter(album => (artistInfo.value as ArtistInfo).albums.find(i => i.id === album.id))
  }
  return []
})

watch(artistName, (val) => {
  if (val)
    document.title = `${val} - HOYO-MiX Online`
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

  <div v-else class="flex flex-col md:flex-row gap-4 mt-4">
    <div class="w-full md:w-[400px] h-fit p-4 bg-black/5 rounded-xl">
      <div class="font-bold text-2xl pb-4">
        {{ artistName }}
        <div v-if="artistInfo?.isHoyomix" class="font-normal text-base text-gray-500">
          HOYO-MiX 成员
        </div>
      </div>
      <div class="font-bold mt-2 mb-1">
        参与项目
      </div>
      <div v-if="artistInfo" class="flex flex-wrap gap-1">
        <div
          v-for="product in artistInfo.products" :key="product"
        >
          <RouterLink
            :to="{ name: 'ProductInfo', params: { name: product } }"
            class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
          >
            <img
              class="size-[20px] rounded-lg"
              :src="getProductIconUrl(product)"
              :alt="product"
            >
            <span class="ml-2">{{ product }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- <div class="font-bold mt-2 mb-1">
        担任职责
      </div>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="song in artistInfo.songs" :key="song.name"
        >
          <Tooltip>
            {{ song.name }}
            <span class="text-xs text-gray-600">{{ song.musics.length }}&nbsp;</span>
            <template #tooltip>
              <div class="p-2 max-w-[300px] bg-white w-fit text-xs rounded-lg shadow">
                <div v-for="music, index in song.musics.slice(0, 10)" :key="index" class="overflow-hidden overflow-ellipsis whitespace-nowrap">
                  {{ music }}
                </div>
                <div v-if="song.musics.length > 10" class="text-gray-500">
                  和其他 {{ song.musics.length - 10 }} 首音乐
                </div>
              </div>
            </template>
          </Tooltip>
        </div>
      </div> -->
    </div>

    <div class="flex-1">
      <AlbumList :albums-list="albumsFiltered" />
    </div>
  </div>
</template>

<style scoped>

</style>

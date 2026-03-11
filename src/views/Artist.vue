<script setup lang="ts">
import { useStore } from '@/store'
import { getArtistData, getProductIconUrl, getProductName } from '@/utils'

const route = useRoute()
const store = useStore()
const { albums } = toRefs(store)

const artistName = computed(() => route.params.name as string)
const albumsFiltered = computed(() => albums.value
  .filter(album =>
    album.musics.find(music =>
      music.artists.find(artist => artist.name === artistName.value),
    ),
  ),
)
const products = computed(() => {
  const result = new Set<string>()
  albumsFiltered.value.forEach((album) => {
    result.add(album.product)
  })
  return Array.from(result)
})
const artistData = computed(() => getArtistData(albumsFiltered.value, artistName.value))
const isHoyomixMember = computed(() =>
  albumsFiltered.value.some(album => album.musics.some(music => music.artists.some(i => i.name === artistName.value && i.o))),
)

onMounted(() => {
  document.title = `${artistName.value} - HOYO-MiX Online`
  store.setBackground()
})
</script>

<template>
  <div class="flex gap-4 mt-4">
    <div class="w-[400px] h-fit p-4 bg-black/5 rounded-xl">
      <div class="font-bold text-2xl pb-4">
        {{ artistName }}
        <div v-if="isHoyomixMember" class="font-normal text-base text-gray-500">
          HOYO-MiX 成员
        </div>
      </div>
      <div class="font-bold mt-2 mb-1">
        参与项目
      </div>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="product in products" :key="product"
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
            <span class="ml-2">{{ getProductName(product) }}</span>
          </RouterLink>
        </div>
      </div>

      <div class="font-bold mt-2 mb-1">
        担任职责
      </div>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="type in artistData" :key="type.name"
        >
          <Tooltip>
            {{ type.name }}
            <span class="text-xs text-gray-600">{{ type.musics.length }}&nbsp;</span>
            <template #tooltip>
              <div class="p-2 max-w-[300px] bg-white w-fit text-xs rounded-lg shadow">
                <div v-for="music, index in type.musics.slice(0, 10)" :key="index" class="overflow-hidden overflow-ellipsis whitespace-nowrap">
                  {{ music }}
                </div>
                <div v-if="type.musics.length > 10" class="text-gray-500">
                  和其他 {{ type.musics.length - 10 }} 首音乐
                </div>
              </div>
            </template>
          </Tooltip>
        </div>
      </div>
    </div>

    <!-- <div class="flex-1">
      <AlbumList :albums-list="albumsFiltered" />
    </div> -->
  </div>
</template>

<style scoped>

</style>

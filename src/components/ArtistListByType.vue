<script setup lang="ts">
import type { AlbumData } from '@/types/core'
import { getArtistsData2 } from '@/utils'

const props = defineProps<{
  albums: AlbumData[]
  musicId?: number
}>()

const artistData = computed(() =>
  getArtistsData2(props.albums, props.musicId),
)
</script>

<template>
  <div
    v-for="typeInfo in artistData" :key="typeInfo.name"
    class="pb-1"
  >
    <div class="font-bold">
      {{ typeInfo.name }}
    </div>
    <div class="flex flex-wrap gap-x-2">
      <div
        v-for="artist in typeInfo.artists" :key="artist.name"
        class="text-sm rounded-md border-gray-400"
      >
        <Tooltip>
          <RouterLink :to="{ name: 'ArtistInfo', params: { name: artist.name } }">
            {{ artist.name }}
            <span class="text-xs text-gray-600">{{ artist.musics.length }}&nbsp;</span>
          </RouterLink>
          <template #tooltip>
            <div class="p-2 max-w-[300px] bg-white w-fit text-xs rounded-lg shadow">
              <div v-for="music, index in artist.musics.slice(0, 10)" :key="index" class="overflow-hidden overflow-ellipsis whitespace-nowrap">
                {{ music }}
              </div>
              <div v-if="artist.musics.length > 10" class="text-gray-500">
                和其他 {{ artist.musics.length - 10 }} 首音乐
              </div>
            </div>
          </template>
        </Tooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>

<script setup lang="ts">
import { getAlbumArtistInfoApi, getMusicArtistInfoApi } from '@/api'

const props = defineProps<{
  id: number
  type: 'album' | 'music'
}>()

interface ArtistTypeInfo {
  [typeName: string]: {
    nameFull: string
    name: string
    songs?: {
      id: number
      name: string
    }[]
  }[]

}

const artistInfo = ref<ArtistTypeInfo>({})

watch(() => props.id, (val) => {
  if (val) {
    artistInfo.value = {}
    if (props.type === 'album') {
      getAlbumArtistInfoApi(val)
        .then(res => res.json())
        .then((data) => {
          artistInfo.value = data
        })
    }
    else if (props.type === 'music') {
      getMusicArtistInfoApi(val)
        .then(res => res.json())
        .then((data) => {
          artistInfo.value = data
        })
    }
  }
}, { immediate: true })
</script>

<template>
  <div
    v-for="([typeName, typeInfo]) in Object.entries(artistInfo)" :key="typeName"
    class="pb-1"
  >
    <div class="font-bold">
      {{ typeName }}
    </div>
    <div class="flex flex-wrap gap-x-2">
      <div
        v-for="artist in typeInfo" :key="artist.nameFull"
        class="text-sm rounded-md border-gray-400"
      >
        <Tooltip>
          <!-- <RouterLink :to="{ name: 'ArtistInfo', params: { name: artist.name } }"> -->
          {{ artist.name }}
          <span v-if="artist.songs" class="text-xs text-gray-600">{{ artist.songs.length }}&nbsp;</span>
          <!-- </RouterLink> -->
          <template v-if="artist.songs" #tooltip>
            <div class="p-2 max-w-[300px] bg-white w-fit text-xs rounded-lg shadow">
              <div v-for="song, index in artist.songs?.slice(0, 10)" :key="index" class="overflow-hidden overflow-ellipsis whitespace-nowrap">
                {{ song.name }}
              </div>
              <div v-if="artist.songs.length > 10" class="text-gray-500">
                和其他 {{ artist.songs.length - 10 }} 首音乐
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

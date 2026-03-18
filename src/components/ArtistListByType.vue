<script setup lang="ts">
import { getCreditInfoApi } from '@/api'

const props = defineProps<{
  id: number | string
  type: 'album' | 'song' | 'product'
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

function sortArtists(info: ArtistTypeInfo) {
  const sorted: ArtistTypeInfo = {}
  for (const typeName in info) {
    sorted[typeName] = info[typeName].sort((a, b) => (b.songs?.length ?? 0) - (a.songs?.length ?? 0))
  }
  return sorted
}

watch(() => props.id, (val) => {
  if (val) {
    artistInfo.value = {}
    getCreditInfoApi(val, props.type)
      .then(res => res.json())
      .then((data) => {
        artistInfo.value = sortArtists(data)
      })
  }
}, { immediate: true })
</script>

<template>
  <div
    v-for="([typeName, artists]) in Object.entries(artistInfo)" :key="typeName"
    class="pb-1"
  >
    <div class="font-bold">
      {{ typeName }}
    </div>
    <div class="flex flex-wrap gap-x-2">
      <div
        v-for="artist in artists" :key="artist.nameFull"
        class="text-sm rounded-md border-gray-400"
      >
        <Tooltip>
          <RouterLink :to="{ name: 'ArtistInfo', params: { name: artist.name } }">
            {{ artist.name }}
            <span v-if="artist.songs" class="text-xs text-gray-600">{{ artist.songs.length }}&nbsp;</span>
          </RouterLink>
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

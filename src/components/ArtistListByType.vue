<script setup lang="ts">
import type { ArtistTypeInfo } from '@/api'
import { useCreditInfoQuery } from '@/composables/queries'
import { artistTypeSort, artistTypeSortLast } from '@/constants'

const props = defineProps<{
  id: number | string
  type: 'album' | 'song' | 'product'
}>()

const id = computed(() => props.id || null)
const type = computed(() => props.type)

const { data: rawData, isLoading } = useCreditInfoQuery(id, type)

function sortArtists(info: ArtistTypeInfo) {
  const sorted: ArtistTypeInfo = {}
  for (const typeName in info) {
    sorted[typeName] = info[typeName].sort((a, b) => (b.songs?.length ?? 0) - (a.songs?.length ?? 0))
  }
  return sorted
}

const sortedEntries = computed(() => {
  const info = rawData.value ? sortArtists(rawData.value) : {}
  return Object.entries(info).sort(([a], [b]) => {
    const ai = artistTypeSort.indexOf(a)
    const bi = artistTypeSort.indexOf(b)
    const ali = artistTypeSortLast.indexOf(a)
    const bli = artistTypeSortLast.indexOf(b)
    const aScore = ai !== -1 ? ai : ali !== -1 ? 10000 + ali : 1000
    const bScore = bi !== -1 ? bi : bli !== -1 ? 10000 + bli : 1000
    return aScore - bScore
  })
})
</script>

<template>
  <div v-if="isLoading" class="w-full flex items-center justify-center py-2 text-gray-400">
    <LucideLoader2 class="size-4 animate-spin mr-2" />
    加载中...
  </div>
  <template v-else>
    <div
      v-for="([typeName, artists]) in sortedEntries" :key="typeName"
      class="pb-1"
    >
      <div class="font-bold">
        {{ typeName }}
      </div>
      <div class="flex flex-wrap gap-x-2">
        <div
          v-for="artist in artists" :key="artist.name"
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
</template>

<style scoped>

</style>

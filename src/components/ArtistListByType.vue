<script setup lang="ts">
import type { ArtistTypeInfo } from '@/types/core'
import { useCreditInfoQuery } from '@/composables/queries'
import { artistTypeSort, artistTypeSortLast } from '@/constants'

const props = defineProps<{
  id: number | string
  type: 'album' | 'song' | 'product'
}>()

const id = computed(() => props.id || null)
const type = computed(() => props.type)

const { data: rawData, isLoading, isError } = useCreditInfoQuery(id, type)

function sortArtists(info: ArtistTypeInfo) {
  const sorted: ArtistTypeInfo = {}
  for (const typeName in info) {
    sorted[typeName] = [...info[typeName]].sort((a, b) => (b.songCount ?? 0) - (a.songCount ?? 0))
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
  <AsyncFade>
    <div v-if="isLoading" class="flex items-center justify-center py-8 text-gray-400">
      <LucideLoader2 class="size-6 animate-spin mr-2" />
      加载中...
    </div>

    <div v-else-if="isError" class="flex items-center justify-center py-8 text-red-400">
      加载失败，请刷新重试
    </div>

    <div v-else>
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
            <ArtistSongsHoverCard
              v-if="type !== 'song' && artist.songs?.length"
              :artist-name="artist.name"
              :role="typeName"
              :context-id="props.id"
              :context-type="type"
              :song-count="artist.songCount"
            />
            <RouterLink v-else :to="{ name: 'ArtistInfo', params: { name: artist.name } }">
              {{ artist.name }}
              <span v-if="artist.songCount != null" class="text-xs text-gray-600">{{ artist.songCount }}&nbsp;</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </AsyncFade>
</template>

<style scoped>

</style>

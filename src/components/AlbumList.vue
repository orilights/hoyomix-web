<script setup lang="ts">
import type { ExportAlbumListItem } from '@/types/export'
import { useElementSize } from '@vueuse/core'
import { getCoverUrl } from '@/utils'

const props = withDefaults(defineProps<{
  albumsList: ExportAlbumListItem[]
  displayByYear?: boolean
}>(), {
  displayByYear: false,
})

const homeContainer = ref<HTMLElement>()
const { width: containerWidth } = useElementSize(homeContainer)

const years = computed(() => {
  if (!props.displayByYear) {
    return [0]
  }
  const years = new Set<number>()
  for (const album of props.albumsList) {
    years.add(getAlbumYear(album))
  }
  return [...years].sort((a, b) => b - a)
})
const gridColumns = computed(() => {
  const num = Math.floor(containerWidth.value / 200)
  if (num < 2)
    return 2
  return num
})

function getAlbumYear(album: ExportAlbumListItem) {
  return new Date(album.publishDate).getFullYear()
}
</script>

<template>
  <div ref="homeContainer">
    <div v-for="year in years" :key="year">
      <div v-if="year" class="font-bold text-4xl pt-4 pb-2 pl-4">
        {{ year }}
      </div>
      <div
        class="grid justify-center"
        :style="{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0px, 1fr))`,
        }"
      >
        <RouterLink
          v-for="album_info in albumsList.filter(i => year === 0 || getAlbumYear(i) === year)" :key="album_info.id"
          :to="{ name: 'AlbumInfo', params: { id: album_info.id } }" :title="album_info.name"
        >
          <div class="p-4 rounded-2xl hover:bg-gray-500/20 transition-colors">
            <div class="rounded-2xl overflow-hidden">
              <CoverImage :src="getCoverUrl(album_info.platforms, '256px')" />
            </div>
            <div class="h-[42px] text-ellipsis text-sm mt-2 line-clamp-2">
              {{ album_info.name }}
            </div>
            <div>
              <span class="text-xs text-gray-500">{{ album_info.publishDate }}</span>
              ·
              <span class="text-xs text-gray-500">{{ album_info.songCount }}</span>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style>
.square {
    overflow: hidden;
}

.square::after {
    content: '';
    display: block;
    margin-top: 100%;
}
</style>

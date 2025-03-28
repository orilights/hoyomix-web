<script setup lang="ts">
import type { AlbumData } from '@/types/core'
import { getCoverUrl, getPublishDate } from '@/utils'
import { useElementSize } from '@vueuse/core'

const props = withDefaults(defineProps<{
  albumsList: AlbumData[]
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
  return Array.from(years).sort((a, b) => b - a)
})
const gridColumns = computed(() => {
  const num = Math.floor(containerWidth.value / 200)
  if (num < 2)
    return 2
  return num
})

function getAlbumYear(album: AlbumData) {
  return new Date(album.publishTime).getFullYear()
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
          v-for="album_info in albumsList.filter(i => year === 0 || getAlbumYear(i) === year)" :key="album_info.netease.id"
          :to="{ name: 'AlbumInfo', params: { id: album_info.netease.id } }" :title="album_info.name"
        >
          <div class="p-4 rounded-2xl hover:bg-gray-500/20 transition-colors">
            <img
              class="rounded-2xl w-full"
              :src="getCoverUrl('netease', album_info.netease.coverPicId, '200px')" :alt="album_info.name"
              loading="lazy"
            >
            <div class="h-[42px] text-ellipsis text-sm mt-2 line-clamp-2">
              {{ album_info.name }}
            </div>
            <div>
              <span class="text-xs text-gray-500">{{ getPublishDate(album_info.publishTime) }}</span>
              ·
              <span class="text-xs text-gray-500">{{ album_info.size }}</span>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

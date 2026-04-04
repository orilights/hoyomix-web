<script setup lang="ts">
import type { ExportAlbumListItem } from '@/types/export'
import { useElementSize } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { getAlbumInfoApi } from '@/api'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'
import { buildPlaylistFromAlbum } from '@/utils/player-utils'

const props = withDefaults(defineProps<{
  albumsList: ExportAlbumListItem[]
  displayByYear?: boolean
}>(), {
  displayByYear: false,
})

const player = usePlayerStore()
const homeContainer = useTemplateRef<HTMLElement>('homeContainer')
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

async function playAlbum(albumId: number) {
  try {
    const album = await getAlbumInfoApi(albumId)
    player.replacePlaylist(buildPlaylistFromAlbum(album), 0)
    toast.success('已替换播放列表')
  }
  catch (error) {
    toast.error(`获取专辑信息失败: ${error instanceof Error ? error.message : error}`)
  }
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
          <div class="group p-4 rounded-2xl hover:bg-gray-500/20 transition-colors relative">
            <div class="rounded-2xl overflow-hidden relative">
              <CoverImage :src="getCoverUrl(album_info.platforms, '256px')" />
              <button
                class="absolute bottom-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-all hidden md:block items-center justify-center hover:scale-105 active:scale-95 cursor-pointer shadow-lg rounded-full p-2 bg-black/40 hover:bg-black/60"
                title="播放专辑"
                @click.prevent="playAlbum(album_info.id)"
              >
                <LucidePlay class="w-6 h-6 fill-white" />
              </button>
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

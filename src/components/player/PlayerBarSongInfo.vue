<script setup lang="ts">
import type { PlaylistItem } from '@/types/player'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'

const props = defineProps<{
  song: PlaylistItem | null
}>()

const player = usePlayerStore()
const { isFullscreen } = storeToRefs(player)

const coverUrl = computed(() => {
  if (!props.song)
    return ''
  return getCoverUrl(props.song.albumPlatforms, '128px')
})
</script>

<template>
  <div class="flex items-center">
    <Transition name="cover-fade">
      <div v-if="coverUrl && !isFullscreen" class="size-12 mr-3 shrink-0">
        <Tooltip content="切换全屏" placement="top" align="center">
          <img
            :src="coverUrl"
            class="size-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity shadow shrink-0"
            @click="isFullscreen = true"
          >
        </Tooltip>
      </div>
    </Transition>
    <div v-if="song" class="min-w-0">
      <div class="text-white text-sm truncate">
        <RouterLink :to="{ name: 'MusicInfo', params: { albumId: song.albumId, musicId: song.songId } }" @click="isFullscreen = false">
          {{ song.songName }}
        </RouterLink>
      </div>
      <div class="text-white/50 text-xs truncate mt-1">
        <RouterLink :to="{ name: 'AlbumInfo', params: { id: song.albumId } }" @click="isFullscreen = false">
          {{ song.albumName }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cover-fade-enter-active,
.cover-fade-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.cover-fade-enter-from,
.cover-fade-leave-to {
  opacity: 0;
  width: 0;
  margin-right: 0;
}
</style>

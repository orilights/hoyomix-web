<script setup lang="ts">
import type { PlaylistItem } from '@/types/player'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'

const props = defineProps<{
  song: PlaylistItem | null
  lyric?: { key: string, text: string } | null
}>()

const router = useRouter()
const player = usePlayerStore()
const { isFullscreen } = storeToRefs(player)

const coverUrl = computed(() => {
  if (!props.song)
    return ''
  return getCoverUrl(props.song.albumPlatforms, '96px')
})

function toSong() {
  if (!props.song)
    return
  player.setFullscreen(false)
  router.push({ name: 'MusicInfo', params: { albumId: props.song.albumId, musicId: props.song.songId } })
}

function toAlbum() {
  if (!props.song)
    return
  player.setFullscreen(false)
  router.push({ name: 'AlbumInfo', params: { id: props.song.albumId } })
}
</script>

<template>
  <div class="flex items-center">
    <Transition name="cover-fade">
      <div v-if="coverUrl && !isFullscreen" class="size-12 mr-3 shrink-0">
        <Tooltip :content="t('PlayerBarSongInfo.toggle_fullscreen_player')" placement="top" align="center">
          <img
            :src="coverUrl"
            class="size-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity shadow shrink-0"
            @click="player.setFullscreen(true)"
          >
        </Tooltip>
      </div>
    </Transition>
    <div v-if="song" class="min-w-0">
      <div class="text-white text-sm truncate cursor-pointer" :title="song.songName" @click="toSong">
        {{ song.songName }}
      </div>
      <div class="relative h-4 overflow-hidden text-white/50 text-xs mt-1 cursor-pointer" :title="lyric?.text ?? song.albumName" @click="toAlbum">
        <Transition name="bar-lyric">
          <div :key="lyric?.key ?? `album:${song.songId}`" class="truncate leading-4">
            {{ lyric?.text ?? song.albumName }}
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-lyric-enter-active {
  position: relative;
  z-index: 1;
  transition: opacity 250ms ease, transform 250ms ease;
}
.bar-lyric-leave-active {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}
.bar-lyric-enter-from {
  opacity: 0;
  transform: translateY(65%);
}
.bar-lyric-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .bar-lyric-enter-active,
  .bar-lyric-leave-active { transition: none; }
  .bar-lyric-enter-from { transform: none; }
}

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

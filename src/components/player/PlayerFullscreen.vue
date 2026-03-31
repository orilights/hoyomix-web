<script setup lang="ts">
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'

const playerStore = usePlayerStore()
const {
  currentSong,
  isPlaying,
  currentTime,
  isFullscreen,
  lyricData,
  lyricTranslation,
  showTranslation,
  showSpectrum,
  enableAudioContext,
  volume,
} = storeToRefs(playerStore)

const coverUrl = computed(() => {
  if (!currentSong.value)
    return ''
  return getCoverUrl(currentSong.value.albumPlatforms, '800px')
})

const blurCoverUrl = computed(() => {
  if (!currentSong.value)
    return ''
  return getCoverUrl(currentSong.value.albumPlatforms, '128px')
})

const bg1Url = ref('')
const bg2Url = ref('')
const showBackground = ref(0)
const lyricViewRef = useTemplateRef('lyricView')

watch(showTranslation, () => {
  nextTick(() => {
    lyricViewRef.value?.scrollToCurrentLine(false)
  })
})

watch(blurCoverUrl, (newVal) => {
  if (!newVal) {
    showBackground.value = 0
    return
  }
  if (showBackground.value !== 1) {
    bg1Url.value = newVal
    showBackground.value = 1
  }
  else {
    bg2Url.value = newVal
    showBackground.value = 2
  }
}, { immediate: true })

function close() {
  playerStore.setFullscreen(false)
}

function onSeek(time: number) {
  playerStore.seek(time)
}
</script>

<template>
  <Transition name="fullscreen-player">
    <div
      v-if="isFullscreen && currentSong"
      class="fixed inset-0 z-50 flex flex-col pb-[72px]"
    >
      <div class="absolute inset-0 overflow-hidden bg-gray-900">
        <div
          class="player-background transition-opacity duration-500"
          :style="{ backgroundImage: bg1Url ? `url(${bg1Url})` : 'none' }"
          :class="showBackground === 1 ? 'opacity-100' : 'opacity-0'"
        />
        <div
          class="player-background transition-opacity duration-500"
          :style="{ backgroundImage: bg2Url ? `url(${bg2Url})` : 'none' }"
          :class="showBackground === 2 ? 'opacity-100' : 'opacity-0'"
        />
        <div class="absolute inset-0 bg-black/50" />
      </div>

      <div class="relative flex-1 flex flex-col z-10 min-h-0">
        <div class="flex items-center justify-between px-6 py-4 shrink-0">
          <Tooltip
            placement="bottom"
            align="start"
            content="退出全屏"
          >
            <button
              class="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              @click="close"
            >
              <LucideChevronDown class="size-6" />
            </button>
          </Tooltip>

          <div class="text-white/60 text-sm">
            {{ currentSong.songName }}
          </div>

          <div class="flex items-center gap-1">
            <Tooltip
              placement="bottom"
              align="end"
              :content="!lyricTranslation ? '当前歌曲无歌词翻译' : '歌词翻译'"
            >
              <button
                class="p-2 rounded-full transition-colors"
                :class="!lyricTranslation
                  ? 'text-white/20 cursor-not-allowed'
                  : showTranslation ? 'text-blue-400 cursor-pointer hover:bg-white/10' : 'text-white/60 hover:text-white cursor-pointer hover:bg-white/10'"
                :disabled="!lyricTranslation"
                @click="playerStore.toggleTranslation()"
              >
                <LucideLanguages class="size-5" />
              </button>
            </Tooltip>

            <Tooltip
              placement="bottom"
              align="end"
              :content="!enableAudioContext ? 'AudioContext API 已禁用，请在设置中开启' : '频谱可视化'"
            >
              <button
                class="p-2 rounded-full transition-colors"
                :class="!enableAudioContext
                  ? 'text-white/20 cursor-not-allowed'
                  : showSpectrum ? 'text-blue-400 cursor-pointer hover:bg-white/10' : 'text-white/60 hover:text-white cursor-pointer hover:bg-white/10'"
                :disabled="!enableAudioContext"
                @click="playerStore.toggleSpectrum()"
              >
                <LucideAudioLines class="size-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        <div class="flex-1 flex items-center px-6 md:px-16 gap-8 min-h-0">
          <div class="hidden md:block w-[40%] max-w-[400px] shrink-0">
            <div class="rounded-2xl overflow-hidden shadow-2xl">
              <img
                :src="coverUrl"
                class="w-full aspect-square object-cover"
              >
            </div>
            <div class="mt-4 text-center">
              <div class="text-white text-xl font-bold truncate">
                <RouterLink :to="{ name: 'MusicInfo', params: { albumId: currentSong.albumId, musicId: currentSong.songId } }" @click="isFullscreen = false">
                  {{ currentSong.songName }}
                </RouterLink>
              </div>
              <div v-if="currentSong.songDescription" class="text-white/50 text-sm mt-1">
                {{ currentSong.songDescription }}
              </div>
            </div>
          </div>

          <div class="flex-1 h-full min-w-0">
            <PlayerLyrics
              ref="lyricView"
              :lyric-data="lyricData"
              :lyric-translation="lyricTranslation"
              :show-translation="showTranslation"
              :current-time="currentTime"
              class="h-full"
              @seek="onSeek"
            />
          </div>
        </div>

        <div class="md:hidden shrink-0 flex justify-end px-6 py-4">
          <div class="flex items-center gap-5 bg-black/40 backdrop-blur-md rounded-full px-6 py-3">
            <input
              type="range"
              :value="volume"
              min="0"
              max="1"
              step="0.01"
              class="volume-slider"
              @input="playerStore.setVolume(Number(($event.target as HTMLInputElement).value))"
            >
            <button class="text-gray-400 hover:text-white transition-colors cursor-pointer" @click="playerStore.playPrev()">
              <LucideSkipBack class="size-6" fill="currentColor" />
            </button>
            <button class="text-gray-400 hover:text-white transition-colors cursor-pointer" @click="playerStore.playNext()">
              <LucideSkipForward class="size-6" fill="currentColor" />
            </button>
          </div>
        </div>

        <div v-if="showSpectrum" class="h-16 shrink-0">
          <PlayerSpectrum :active="showSpectrum && isPlaying" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.player-background {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.1);
  filter: blur(40px) brightness(0.7);
}

.volume-slider {
  height: 4px;
  accent-color: white;
}

.fullscreen-player-enter-active,
.fullscreen-player-leave-active {
  transition: all 0.4s ease;
}
.fullscreen-player-enter-from,
.fullscreen-player-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>

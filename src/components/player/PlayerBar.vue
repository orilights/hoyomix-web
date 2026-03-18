<script setup lang="ts">
import type { AudioQuality, PlayMode } from '@/types/player'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

const playerStore = usePlayerStore()
const {
  currentSong,
  isPlaying,
  currentTime,
  duration,
  bufferedEnd,
  volume,
  playMode,
  quality,
  isFullscreen,
  showPlaylist,
} = storeToRefs(playerStore)

const showVolumeSlider = ref(false)
const volumeBeforeMute = ref(0.8)

function toggleMute() {
  if (volume.value > 0) {
    volumeBeforeMute.value = volume.value
    playerStore.setVolume(0)
  }
  else {
    playerStore.setVolume(volumeBeforeMute.value || 0.5)
  }
}

function onVolumeWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  playerStore.setVolume(volume.value + delta)
}

const coverUrl = computed(() => {
  if (!currentSong.value)
    return ''
  return getCoverUrl(currentSong.value.albumPlatforms, '200px')
})

const playModeIcon = computed(() => {
  const map: Record<PlayMode, string> = {
    sequential: '顺序播放',
    loop: '列表循环',
    single: '单曲循环',
    shuffle: '随机播放',
  }
  return map[playMode.value]
})

const qualityLabel = computed(() => quality.value.toUpperCase())

function onSeek(time: number) {
  playerStore.seek(time)
}

function toggleQuality() {
  const next: AudioQuality = quality.value === 'hq' ? 'sq' : 'hq'
  playerStore.switchQuality(next)
}

function openFullscreen() {
  playerStore.setFullscreen(true)
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-[60]">
    <div class="md:hidden">
      <PlayerProgress
        :current-time="currentTime"
        :duration="duration"
        :buffered-end="bufferedEnd"
        thin
        @seek="onSeek"
      />
    </div>

    <div class="bg-gray-900/95 backdrop-blur-xl border-t border-white/10">
      <div class="h-[72px] flex items-center px-4 gap-4">
        <div class="flex items-center gap-3 min-w-0 w-[240px] shrink-0">
          <img
            v-if="coverUrl && !isFullscreen"
            :src="coverUrl"
            class="size-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity shadow shrink-0"
            @click="openFullscreen"
          >
          <div v-if="currentSong" class="min-w-0">
            <div class="text-white text-sm truncate">
              {{ currentSong.songName }}
            </div>
            <div class="text-white/50 text-xs truncate">
              {{ currentSong.albumName }}
            </div>
          </div>
        </div>

        <div class="hidden md:flex flex-col items-center flex-1 gap-1">
          <div class="flex items-center gap-4">
            <button
              class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
              @click="playerStore.playPrev()"
            >
              <LucideSkipBack class="size-5" fill="currentColor" />
            </button>

            <button
              class="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
              @click="playerStore.togglePlay()"
            >
              <LucidePlay v-if="!isPlaying" class="size-5" fill="currentColor" />
              <LucidePause v-else class="size-5" fill="currentColor" stroke-width="0.5" />
            </button>

            <button
              class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
              @click="playerStore.playNext()"
            >
              <LucideSkipForward class="size-5" fill="currentColor" />
            </button>
          </div>

          <div class="w-full max-w-[600px] flex items-center gap-2">
            <span class="text-white/50 text-xs w-10 text-right shrink-0">
              {{ formatDuration(Math.floor(currentTime)) }}
            </span>
            <PlayerProgress
              :current-time="currentTime"
              :duration="duration"
              :buffered-end="bufferedEnd"
              class="flex-1"
              @seek="onSeek"
            />
            <span class="text-white/50 text-xs w-10 shrink-0">
              {{ formatDuration(Math.floor(duration)) }}
            </span>
          </div>
        </div>

        <div class="flex md:hidden items-center gap-2 ml-auto">
          <button
            class="text-white p-2 cursor-pointer"
            @click="playerStore.togglePlay()"
          >
            <LucidePlay v-if="!isPlaying" class="size-6" fill="currentColor" />
            <LucidePause v-else class="size-6" fill="currentColor" stroke-width="0.5" />
          </button>
          <button
            class="text-white/60 hover:text-white p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
            @click="showPlaylist = !showPlaylist"
          >
            <LucideList class="size-4" />
          </button>
        </div>

        <div class="hidden md:flex items-center gap-1 w-[240px] justify-end shrink-0">
          <button
            class="text-xs font-bold px-2 py-1 rounded border cursor-pointer transition-colors"
            :class="quality === 'sq'
              ? 'text-amber-400 border-amber-400/50 hover:bg-amber-400/10'
              : 'text-white/60 border-white/30 hover:bg-white/10'"
            @click="toggleQuality"
          >
            {{ qualityLabel }}
          </button>

          <button
            class="text-white/60 hover:text-white p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
            :title="playModeIcon"
            @click="playerStore.togglePlayMode()"
          >
            <LucideListEnd v-if="playMode === 'sequential'" class="size-4" />
            <LucideRepeat v-else-if="playMode === 'loop'" class="size-4" />
            <LucideRepeat1 v-else-if="playMode === 'single'" class="size-4" />
            <LucideShuffle v-else class="size-4" />
          </button>

          <div class="relative" @wheel.prevent="onVolumeWheel">
            <button
              class="text-white/60 hover:text-white p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
              @click="toggleMute"
              @mouseenter="showVolumeSlider = true"
              @mouseleave="showVolumeSlider = false"
            >
              <LucideVolume2 v-if="volume > 0" class="size-4" />
              <LucideVolumeX v-else class="size-4" />
            </button>
            <Transition name="dropdown">
              <div
                v-show="showVolumeSlider"
                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 rounded-lg p-3 shadow-xl"
                @mouseenter="showVolumeSlider = true"
                @mouseleave="showVolumeSlider = false"
              >
                <div class="h-24 flex justify-center">
                  <input
                    type="range"
                    :value="volume"
                    min="0"
                    max="1"
                    step="0.01"
                    class="volume-slider"
                    @input="playerStore.setVolume(Number(($event.target as HTMLInputElement).value))"
                  >
                </div>
              </div>
            </Transition>
          </div>

          <button
            class="text-white/60 hover:text-white p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
            @click="showPlaylist = !showPlaylist"
          >
            <LucideList class="size-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.volume-slider {
  writing-mode: vertical-lr;
  direction: rtl;
  appearance: slider-vertical;
  width: 4px;
  height: 100%;
  accent-color: white;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.dropdown-enter-to,
.dropdown-leave-from {
  transform: translateY(0);
}
</style>

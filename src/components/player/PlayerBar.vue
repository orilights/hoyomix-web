<script setup lang="ts">
import type { PlayMode } from '@/types/player'
import { audioQualityOptions, getQualityLabel } from '@/constants'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

const playerStore = usePlayerStore()
const {
  currentSong,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  bufferedEnd,
  volume,
  playMode,
  quality,
  isFullscreen,
  showPlaylist,
  availableQualities,
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
  return getCoverUrl(currentSong.value.albumPlatforms, '128px')
})

const playBtnTip = computed(() => {
  if (isLoading.value)
    return '加载中，请稍后'
  return isPlaying.value ? '暂停' : '播放'
})

const playModeTip = computed(() => {
  const map: Record<PlayMode, string> = {
    sequential: '顺序播放',
    loop: '列表循环',
    single: '单曲循环',
    shuffle: '随机播放',
  }
  return map[playMode.value]
})

const qualityLabel = computed(() => getQualityLabel(quality.value))

const qualityOptions = computed(() =>
  audioQualityOptions.map(opt => ({
    label: opt.label,
    desc: opt.desc,
    disabled: !availableQualities.value.has(opt.value),
    onClick: () => playerStore.switchQuality(opt.value),
  })),
)

function onSeek(time: number) {
  playerStore.seek(time)
}

function openFullscreen() {
  playerStore.setFullscreen(true)
}

// 移动端左右滑动切换歌曲
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeOffset = ref(0)
const isHorizontalSwipe = ref(false)
const swipeSnapBack = ref(false)

function onBarTouchStart(e: TouchEvent) {
  swipeStartX.value = e.touches[0].clientX
  swipeStartY.value = e.touches[0].clientY
  isHorizontalSwipe.value = false
  swipeSnapBack.value = false
}

function onBarTouchMove(e: TouchEvent) {
  const deltaX = e.touches[0].clientX - swipeStartX.value
  const deltaY = e.touches[0].clientY - swipeStartY.value
  if (!isHorizontalSwipe.value && Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8)
    return
  if (!isHorizontalSwipe.value) {
    if (Math.abs(deltaX) > Math.abs(deltaY))
      isHorizontalSwipe.value = true
    else
      return
  }
  e.preventDefault()
  swipeOffset.value = deltaX
}

function onBarTouchEnd() {
  if (!isHorizontalSwipe.value || Math.abs(swipeOffset.value) < 60) {
    return
  }
  const direction = swipeOffset.value < 0 ? 'next' : 'prev'
  swipeSnapBack.value = true
  nextTick(() => {
    swipeOffset.value = 0
  })
  setTimeout(() => {
    swipeSnapBack.value = false
  }, 300)
  if (direction === 'next')
    playerStore.playNext()
  else
    playerStore.playPrev()
  isHorizontalSwipe.value = false
}

onMounted(() => {
  if (currentSong.value) {
    playerStore.fetchLyric()
  }
})
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

    <div
      class="backdrop-blur-xl border-t border-white/10 transition-colors"
      :class="{
        'bg-gray-900/95': !isFullscreen,
        'bg-gray-900/20': isFullscreen,
      }"
    >
      <div
        class="h-[72px] flex items-center px-4 gap-4"
        :style="{
          transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: swipeSnapBack ? 'transform 0.5s ease' : undefined,
        }"
        @touchstart="onBarTouchStart"
        @touchmove="onBarTouchMove"
        @touchend="onBarTouchEnd"
      >
        <div class="flex items-center min-w-0 max-w-[240px] md:w-[240px]">
          <Transition name="cover-fade">
            <div v-if="coverUrl && !isFullscreen" class="size-12 mr-3 shrink-0">
              <Tooltip content="切换全屏" placement="top" align="start">
                <img
                  :src="coverUrl"
                  class="size-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity shadow shrink-0"
                  @click="openFullscreen"
                >
              </Tooltip>
            </div>
          </Transition>
          <div v-if="currentSong" class="min-w-0">
            <div class="text-white text-sm truncate">
              <RouterLink :to="{ name: 'MusicInfo', params: { albumId: currentSong.albumId, musicId: currentSong.songId } }" @click="isFullscreen = false">
                {{ currentSong.songName }}
              </RouterLink>
            </div>
            <div class="text-white/50 text-xs truncate mt-1">
              <RouterLink :to="{ name: 'AlbumInfo', params: { id: currentSong.albumId } }" @click="isFullscreen = false">
                {{ currentSong.albumName }}
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="hidden md:flex flex-col items-center flex-1 gap-1 shrink-0">
          <div class="flex items-center gap-4">
            <Tooltip content="上一首" placement="top" align="center">
              <button
                class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                @click="playerStore.playPrev()"
              >
                <LucideSkipBack class="size-5" fill="currentColor" />
              </button>
            </Tooltip>

            <Tooltip :content="playBtnTip" placement="top" align="center">
              <button
                class="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
                @click="playerStore.togglePlay()"
              >
                <LucideLoader2 v-if="isLoading" class="size-5 animate-spin" />
                <LucidePlay v-else-if="!isPlaying" class="size-5" fill="currentColor" />
                <LucidePause v-else class="size-5" fill="currentColor" stroke-width="0.5" />
              </button>
            </Tooltip>

            <Tooltip content="下一首" placement="top" align="center">
              <button
                class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                @click="playerStore.playNext()"
              >
                <LucideSkipForward class="size-5" fill="currentColor" />
              </button>
            </Tooltip>
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

        <div class="flex items-center gap-2 w-[240px] ml-auto justify-end">
          <Tooltip :content="playBtnTip" placement="top" align="center">
            <button
              class="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer md:hidden"
              @click="playerStore.togglePlay()"
            >
              <LucideLoader2 v-if="isLoading" class="size-6 animate-spin" />
              <LucidePlay v-else-if="!isPlaying" class="size-6" fill="currentColor" />
              <LucidePause v-else class="size-6" fill="currentColor" stroke-width="0.5" />
            </button>
          </Tooltip>

          <Dropdown :options="qualityOptions" alignment="center" position="up" dark>
            <Tooltip content="音频质量" placement="top" align="center">
              <button
                class="text-xs font-bold px-2 py-1 rounded border cursor-pointer transition-colors"
                :class="quality === 9
                  ? 'text-amber-400 border-amber-400/50 hover:bg-amber-400/10'
                  : 'text-white/60 border-white/30 hover:bg-white/10'"
              >
                {{ qualityLabel }}
              </button>
            </Tooltip>
          </Dropdown>

          <Tooltip :content="playModeTip" placement="top" align="center">
            <button
              class="text-white/60 hover:text-white p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
              :title="playModeTip"
              @click="playerStore.togglePlayMode()"
            >
              <LucideListEnd v-if="playMode === 'sequential'" class="size-4" />
              <LucideRepeat v-else-if="playMode === 'loop'" class="size-4" />
              <LucideRepeat1 v-else-if="playMode === 'single'" class="size-4" />
              <LucideShuffle v-else class="size-4" />
            </button>
          </Tooltip>

          <div class="hidden md:block relative" @wheel.prevent="onVolumeWheel">
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

          <Tooltip content="播放列表" placement="top" align="end">
            <button
              class="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
              :class="{ 'text-blue-400': showPlaylist, 'text-white/60 hover:text-white': !showPlaylist }"
              @click="showPlaylist = !showPlaylist"
            >
              <LucideList class="size-4" />
            </button>
          </Tooltip>
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

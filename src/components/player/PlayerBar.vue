<script setup lang="ts">
import type { PlayMode } from '@/types/player'
import { audioQualityOptions, getQualityLabel } from '@/constants'
import { usePlayerStore } from '@/store/player'

const player = usePlayerStore()
const {
  currentSong,
  playlist,
  currentIndex,
  currentTime,
  duration,
  bufferedEnd,
  volume,
  playMode,
  quality,
  isFullscreen,
  showPlaylist,
  availableQualities,
} = storeToRefs(player)

const showVolumeSlider = ref(false)
const volumeBeforeMute = ref(0.8)

function toggleMute() {
  if (volume.value > 0) {
    volumeBeforeMute.value = volume.value
    player.setVolume(0)
  }
  else {
    player.setVolume(volumeBeforeMute.value || 0.5)
  }
}

function onVolumeWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  player.setVolume(volume.value + delta)
}

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
    onClick: () => player.switchQuality(opt.value),
  })),
)

// 移动端左右滑动切换歌曲
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeOffset = ref(0)
const isHorizontalSwipe = ref(false)
const swipeTransition = ref(false)
const swipeActive = ref(false)

// 上一首/下一首歌曲预览（shuffle/single 模式无法预测）
const prevSong = computed(() => {
  if (playlist.value.length === 0 || playMode.value === 'shuffle' || playMode.value === 'single')
    return null
  const idx = playMode.value === 'loop'
    ? (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
    : currentIndex.value > 0 ? currentIndex.value - 1 : null
  return idx !== null ? playlist.value[idx] : null
})

const nextSong = computed(() => {
  if (playlist.value.length === 0 || playMode.value === 'shuffle' || playMode.value === 'single')
    return null
  const idx = playMode.value === 'loop'
    ? (currentIndex.value + 1) % playlist.value.length
    : currentIndex.value < playlist.value.length - 1 ? currentIndex.value + 1 : null
  return idx !== null ? playlist.value[idx] : null
})

function onBarTouchStart(e: TouchEvent) {
  if (window.innerWidth >= 768)
    return
  swipeStartX.value = e.touches[0].clientX
  swipeStartY.value = e.touches[0].clientY
  isHorizontalSwipe.value = false
  swipeTransition.value = false
}

function onBarTouchMove(e: TouchEvent) {
  const deltaX = e.touches[0].clientX - swipeStartX.value
  const deltaY = e.touches[0].clientY - swipeStartY.value
  if (!isHorizontalSwipe.value && Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8)
    return
  if (!isHorizontalSwipe.value) {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      isHorizontalSwipe.value = true
      swipeActive.value = true
    }
    else {
      return
    }
  }
  e.preventDefault()
  swipeOffset.value = deltaX
}

function onBarTouchEnd() {
  if (!isHorizontalSwipe.value || Math.abs(swipeOffset.value) < 60) {
    if (swipeOffset.value !== 0) {
      swipeTransition.value = true
      swipeOffset.value = 0
      setTimeout(() => {
        swipeTransition.value = false
        swipeActive.value = false
      }, 300)
    }
    else {
      swipeActive.value = false
    }
    return
  }
  const direction = swipeOffset.value < 0 ? 'next' : 'prev'
  swipeTransition.value = true
  swipeOffset.value = direction === 'next' ? -window.innerWidth : window.innerWidth
  setTimeout(() => {
    if (direction === 'next')
      player.playNext()
    else
      player.playPrev()
    swipeTransition.value = false
    swipeOffset.value = 0
    isHorizontalSwipe.value = false
    setTimeout(() => {
      swipeActive.value = false
    }, 50)
  }, 300)
}

onMounted(() => {
  if (currentSong.value) {
    player.fetchLyric()
  }
})
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-60">
    <div class="md:hidden">
      <PlayerProgress
        :current-time="currentTime"
        :duration="duration"
        :buffered-end="bufferedEnd"
        thin
        @seek="player.seek"
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
        class="h-[72px] relative"
        :class="{ 'overflow-hidden': swipeActive }"
        @touchstart="onBarTouchStart"
        @touchmove="onBarTouchMove"
        @touchend="onBarTouchEnd"
      >
        <div
          v-if="swipeActive"
          class="absolute inset-0 md:hidden flex items-center px-4"
          :style="{
            transform: `translateX(calc(-100% + ${swipeOffset}px))`,
            transition: swipeTransition ? 'transform 0.3s ease' : undefined,
          }"
        >
          <PlayerBarSongInfo :song="prevSong" />
        </div>

        <div
          v-if="swipeActive"
          class="absolute inset-0 md:hidden flex items-center px-4"
          :style="{
            transform: `translateX(calc(100% + ${swipeOffset}px))`,
            transition: swipeTransition ? 'transform 0.3s ease' : undefined,
          }"
        >
          <PlayerBarSongInfo :song="nextSong" />
        </div>

        <div
          class="absolute inset-0 flex items-center px-4 gap-4"
          :style="{
            transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
            transition: swipeTransition ? 'transform 0.3s ease' : undefined,
          }"
        >
          <PlayerBarSongInfo :song="currentSong" :class="{ 'min-w-0 max-w-[240px] md:w-[240px]': !swipeActive }" />

          <div class="hidden md:block flex-1 shrink-0">
            <PlayerControl />
          </div>

          <Transition name="fade">
            <div v-show="!swipeActive" class="flex items-center gap-2 w-[240px] ml-auto justify-end">
              <PlayerPlayBtn class="md:hidden" />

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
                  @click="player.togglePlayMode()"
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
                        @input="player.setVolume(Number(($event.target as HTMLInputElement).value))"
                      >
                    </div>
                  </div>
                </Transition>
              </div>

              <Tooltip content="播放列表" placement="top" align="center">
                <button
                  class="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  :class="{ 'text-blue-400': showPlaylist, 'text-white/60 hover:text-white': !showPlaylist }"
                  @click="showPlaylist = !showPlaylist"
                >
                  <LucideList class="size-4" />
                </button>
              </Tooltip>
            </div>
          </Transition>
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

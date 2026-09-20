<script setup lang="ts">
import { useFullscreen, useMediaQuery, useWindowSize } from '@vueuse/core'
import { usePlayerCoverColors } from '@/composables/usePlayerCoverColors'
import { usePlayerLyrics } from '@/composables/usePlayerLyrics'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'
import { fallbackCoverColors } from '@/utils/cover'

const router = useRouter()
const player = usePlayerStore()
const {
  currentSong,
  isPlaying,
  currentTime,
  duration,
  bufferedEnd,
  isFullscreen,
  isImmersive,
  immersiveControlsVisible,
  lyricData,
  lyricTranslation,
  showTranslation,
  showFullscreenLyrics,
  showSpectrum,
  enableAudioContext,
  lyricsOffset,
  lyricsFontSize,
  mobileFullscreenLayout,
  fullscreenCoverShape,
  fullscreenCoverRotation,
  fullscreenCoverBorder,
} = storeToRefs(player)

const isRoundCover = computed(() => fullscreenCoverShape.value === 'circle')
const isMobileViewport = useMediaQuery('(max-width: 767px)')
const coverMenu = ref<{ x: number, y: number } | null>(null)
const coverMenuRef = ref<HTMLElement | null>(null)
let coverPressTimer: ReturnType<typeof setTimeout> | null = null
let coverPressStart: { x: number, y: number } | null = null
let suppressCoverClick = false

function closeCoverMenu() {
  coverMenu.value = null
}

function openCoverMenu(x: number, y: number) {
  const menuWidth = 216
  const menuHeight = 214
  const margin = 8
  coverMenu.value = {
    x: Math.max(margin, Math.min(x, window.innerWidth - menuWidth - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - menuHeight - margin)),
  }
  nextTick(() => coverMenuRef.value?.querySelector<HTMLButtonElement>('button')?.focus())
}

function cancelCoverPress() {
  if (coverPressTimer)
    clearTimeout(coverPressTimer)
  coverPressTimer = null
  coverPressStart = null
}

function onCoverTouchStart(event: TouchEvent) {
  cancelCoverPress()
  if (event.touches.length !== 1)
    return
  const { clientX, clientY } = event.touches[0]
  coverPressStart = { x: clientX, y: clientY }
  coverPressTimer = setTimeout(() => {
    suppressCoverClick = true
    openCoverMenu(clientX, clientY)
    coverPressTimer = null
  }, 550)
}

function onCoverTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch || !coverPressStart || Math.hypot(touch.clientX - coverPressStart.x, touch.clientY - coverPressStart.y) > 10)
    cancelCoverPress()
}

function onCoverTouchEnd(event: TouchEvent) {
  cancelCoverPress()
  if (suppressCoverClick) {
    event.preventDefault()
    setTimeout(() => {
      suppressCoverClick = false
    }, 0)
  }
}

function onCoverContextMenu(event: MouseEvent) {
  event.preventDefault()
  const wasTouchPress = coverPressStart !== null
  cancelCoverPress()
  if (wasTouchPress)
    suppressCoverClick = true
  openCoverMenu(event.clientX, event.clientY)
}

function onMobileCoverClick(event: MouseEvent) {
  if (suppressCoverClick) {
    event.preventDefault()
    suppressCoverClick = false
    return
  }
  showLyricsLayout()
}

function onDocumentPointerDown(event: PointerEvent) {
  if (coverMenu.value && !coverMenuRef.value?.contains(event.target as Node))
    closeCoverMenu()
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if (coverMenu.value && event.key === 'Escape') {
    event.stopPropagation()
    closeCoverMenu()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeyDown)
})

watch(isFullscreen, (value) => {
  if (!value)
    closeCoverMenu()
})

const coverUrl = computed(() => {
  if (!currentSong.value)
    return ''
  return getCoverUrl(currentSong.value.albumPlatforms, '800px')
})

const { gradient: coverGradient } = usePlayerCoverColors()
const bg1 = ref(fallbackCoverColors.gradient)
const bg2 = ref(fallbackCoverColors.gradient)
const showBackground = ref(1)
const transformPosition = ref('')
const { width: viewportWidth, height: viewportHeight } = useWindowSize()
const {
  isFullscreen: isPageFullscreen,
  isSupported: isPageFullscreenSupported,
  toggle: togglePageFullscreen,
} = useFullscreen()

const { parsedLyrics, hasTimestamp, currentLineIndex } = usePlayerLyrics({
  lyricData,
  lyricTranslation,
  currentTime,
  lyricsOffset,
})

const compactLyricLine = computed(() => {
  if (parsedLyrics.value.length === 0 || !hasTimestamp.value)
    return null
  const index = currentLineIndex.value >= 0 ? currentLineIndex.value : 0
  return parsedLyrics.value[index] ?? null
})

const compactCoverSize = computed(() => {
  const availableHeight = viewportHeight.value
    - 72 // fixed player bar spacing
    - 56 // header
    - (isImmersive.value ? 0 : 80) // mobile controls
    - 96 // lyric text and gap
  return Math.max(72, Math.min(
    viewportWidth.value * 0.72,
    viewportHeight.value * 0.42,
    availableHeight,
  ))
})

let immersiveTimer: ReturnType<typeof setTimeout> | null = null
const IMMERSIVE_HIDE_DELAY = 3000

function showImmersiveControls() {
  player.setImmersiveControlsVisible(true)
  if (immersiveTimer)
    clearTimeout(immersiveTimer)
  immersiveTimer = setTimeout(() => {
    player.setImmersiveControlsVisible(false)
  }, IMMERSIVE_HIDE_DELAY)
}

function onImmersiveActivity() {
  if (!isImmersive.value)
    return
  showImmersiveControls()
}

watch(isImmersive, (val) => {
  if (val) {
    showImmersiveControls()
  }
  else {
    if (immersiveTimer)
      clearTimeout(immersiveTimer)
    immersiveTimer = null
    player.setImmersiveControlsVisible(true)
  }
})

onUnmounted(() => {
  cancelCoverPress()
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
  if (immersiveTimer)
    clearTimeout(immersiveTimer)
})

watch(coverGradient, (gradient) => {
  if (showBackground.value !== 1) {
    bg1.value = gradient
    showBackground.value = 1
  }
  else {
    bg2.value = gradient
    showBackground.value = 2
  }
}, { immediate: true })

function close() {
  player.setFullscreen(false)
}

function toSong() {
  if (!currentSong.value)
    return
  player.setFullscreen(false)
  router.push({ name: 'MusicInfo', params: { albumId: currentSong.value.albumId, musicId: currentSong.value.songId } })
}

function toAlbum() {
  if (!currentSong.value)
    return
  player.setFullscreen(false)
  router.push({ name: 'AlbumInfo', params: { id: currentSong.value.albumId } })
}

function onSeek(time: number) {
  player.seek(time)
}

function showLyricsLayout() {
  player.setMobileFullscreenLayout('lyrics')
}

const touchStartY = ref(0)
const dragOffset = ref(0)
const snapBack = ref(false)

function onHeaderTouchStart(e: TouchEvent) {
  snapBack.value = false
  touchStartY.value = e.touches[0].clientY
}

function onHeaderTouchMove(e: TouchEvent) {
  const delta = e.touches[0].clientY - touchStartY.value
  if (delta > 0) {
    dragOffset.value = delta
  }
}

function onHeaderTouchEnd() {
  if (dragOffset.value > 80) {
    transformPosition.value = `${dragOffset.value}px`
    dragOffset.value = 0
    nextTick(() => {
      close()
    })
    setTimeout(() => {
      transformPosition.value = ''
    }, 400)
  }
  else if (dragOffset.value > 0) {
    snapBack.value = true
    dragOffset.value = 0
    setTimeout(() => {
      snapBack.value = false
    }, 300)
  }
}
</script>

<template>
  <Transition name="fullscreen-player">
    <div
      v-if="isFullscreen && currentSong"
      class="fixed inset-0 z-50 flex flex-col pb-[72px]"
      :style="{
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        transition: snapBack ? 'transform 0.3s ease' : undefined,
      }"
      @mousemove="onImmersiveActivity"
      @touchstart="onImmersiveActivity"
    >
      <div class="absolute inset-0 bg-gray-900">
        <div
          class="absolute inset-0 transition-opacity duration-700"
          :style="{ background: bg1 }"
          :class="showBackground === 1 ? 'opacity-100' : 'opacity-0'"
        />
        <div
          class="absolute inset-0 transition-opacity duration-700"
          :style="{ background: bg2 }"
          :class="showBackground === 2 ? 'opacity-100' : 'opacity-0'"
        />
      </div>
      <div class="background-mask absolute inset-0" />

      <div class="relative flex-1 flex flex-col z-10 min-h-0">
        <div
          class="relative z-10 flex items-center justify-between px-6 py-4 shrink-0 transition-opacity duration-300"
          :class="{ 'opacity-0': isImmersive && !immersiveControlsVisible }"
          @touchstart="onHeaderTouchStart"
          @touchmove.prevent="onHeaderTouchMove"
          @touchend="onHeaderTouchEnd"
        >
          <div class="flex items-center gap-1">
            <Tooltip
              placement="bottom"
              align="center"
              content="退出全屏播放器"
            >
              <button
                class="size-10 shrink-0 inline-flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                @click="close"
              >
                <LucideChevronDown class="size-6" />
              </button>
            </Tooltip>

            <Tooltip
              placement="bottom"
              align="center"
              :content="isPageFullscreenSupported ? (isPageFullscreen ? '退出页面全屏' : '进入页面全屏') : '当前浏览器不支持页面全屏'"
            >
              <button
                class="size-10 shrink-0 inline-flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                :class="{ 'opacity-40 cursor-not-allowed': !isPageFullscreenSupported }"
                :disabled="!isPageFullscreenSupported"
                :aria-label="isPageFullscreen ? '退出页面全屏' : '进入页面全屏'"
                @click="togglePageFullscreen()"
              >
                <LucideMaximize v-if="!isPageFullscreen" class="size-5" />
                <LucideMinimize v-else class="size-5" />
              </button>
            </Tooltip>
          </div>

          <div
            v-show="!isImmersive || immersiveControlsVisible"
            class="text-white/60 text-sm text-nowrap truncate cursor-pointer"
            @click="toAlbum"
          >
            {{ currentSong.albumName }}
          </div>

          <div class="flex items-center gap-1">
            <div class="flex items-center gap-1">
              <Tooltip
                placement="bottom"
                align="center"
                :content="showFullscreenLyrics ? '隐藏歌词' : '显示歌词'"
              >
                <button
                  class="size-10 shrink-0 hidden md:inline-flex items-center justify-center rounded-full transition-colors cursor-pointer hover:bg-white/10"
                  :class="showFullscreenLyrics ? 'text-blue-400' : 'text-white/60 hover:text-white'"
                  :aria-label="showFullscreenLyrics ? '隐藏歌词' : '显示歌词'"
                  :aria-pressed="showFullscreenLyrics"
                  @click="player.toggleFullscreenLyrics()"
                >
                  <LucideScrollText class="size-5" />
                </button>
              </Tooltip>

              <Tooltip
                placement="bottom"
                align="center"
                :content="!lyricTranslation ? '当前歌曲无歌词翻译' : '歌词翻译'"
              >
                <button
                  class="size-10 shrink-0 inline-flex items-center justify-center rounded-full transition-colors"
                  :class="!lyricTranslation
                    ? 'text-white/20'
                    : showTranslation ? 'text-blue-400 cursor-pointer hover:bg-white/10' : 'text-white/60 hover:text-white cursor-pointer hover:bg-white/10'"
                  :disabled="!lyricTranslation"
                  @click="player.toggleTranslation()"
                >
                  <LucideLanguages class="size-5" />
                </button>
              </Tooltip>

              <Tooltip
                placement="bottom"
                align="center"
                :content="!enableAudioContext ? 'AudioContext API 已禁用，请在设置中开启' : '频谱可视化'"
              >
                <button
                  class="size-10 shrink-0 inline-flex items-center justify-center rounded-full transition-colors"
                  :class="!enableAudioContext
                    ? 'text-white/20'
                    : showSpectrum ? 'text-blue-400 cursor-pointer hover:bg-white/10' : 'text-white/60 hover:text-white cursor-pointer hover:bg-white/10'"
                  :disabled="!enableAudioContext"
                  @click="player.toggleSpectrum()"
                >
                  <LucideAudioLines class="size-5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div class="relative z-10 flex-1 flex items-center px-6 md:px-16 gap-8 min-h-0" :class="{ 'justify-center': !isMobileViewport && !showFullscreenLyrics }">
          <div class="hidden md:block w-[40%] max-w-[40vh] shrink-0" :class="!isMobileViewport && !showFullscreenLyrics ? 'mx-auto' : 'mx-[5vw]'">
            <div
              class="w-full aspect-square shadow-2xl"
              :class="[isRoundCover ? 'rounded-full' : 'rounded-2xl', { 'fullscreen-cover-border': isRoundCover && fullscreenCoverBorder }]"
              @contextmenu="onCoverContextMenu"
            >
              <LazyImg
                class="size-full fullscreen-cover-image"
                :class="[isRoundCover ? 'rounded-full' : 'rounded-2xl', { 'fullscreen-cover-art': isRoundCover && fullscreenCoverBorder, 'fullscreen-cover-spin': isRoundCover && fullscreenCoverRotation, 'fullscreen-cover-spin-paused': !isPlaying }]"
                :src="coverUrl"
                :alt="`${currentSong.songName} 封面`"
              />
            </div>
            <div class="mt-4 text-center">
              <div class="text-white text-xl font-bold truncate cursor-pointer" :title="currentSong.songName" @click="toSong">
                {{ currentSong.songName }}
              </div>
              <div v-if="currentSong.songDescription && (!isImmersive || immersiveControlsVisible)" class="text-white/50 text-sm mt-1">
                {{ currentSong.songDescription }}
              </div>
            </div>
          </div>

          <div
            v-if="isMobileViewport && mobileFullscreenLayout === 'cover'"
            class="md:hidden flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-2 overflow-hidden"
          >
            <button
              type="button"
              class="max-w-full aspect-square shadow-2xl cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 shrink-0"
              :class="[isRoundCover ? 'rounded-full' : 'rounded-2xl ring-1 ring-white/10', { 'fullscreen-cover-border': isRoundCover && fullscreenCoverBorder }]"
              :style="{ width: `${compactCoverSize}px`, height: `${compactCoverSize}px` }"
              aria-label="切换到完整歌词布局"
              title="切换到完整歌词布局"
              @click="onMobileCoverClick"
              @contextmenu="onCoverContextMenu"
              @touchstart="onCoverTouchStart"
              @touchmove="onCoverTouchMove"
              @touchend="onCoverTouchEnd"
              @touchcancel="cancelCoverPress"
            >
              <LazyImg
                class="size-full object-cover fullscreen-cover-image"
                :class="[isRoundCover ? 'rounded-full' : 'rounded-2xl', { 'fullscreen-cover-art': isRoundCover && fullscreenCoverBorder, 'fullscreen-cover-spin': isRoundCover && fullscreenCoverRotation, 'fullscreen-cover-spin-paused': !isPlaying }]"
                :src="coverUrl"
                :alt="`${currentSong.songName} 封面`"
              />
            </button>

            <div class="w-full max-w-[min(88vw,520px)] min-h-[3.5rem] text-center flex items-center justify-center px-2">
              <div v-if="parsedLyrics.length === 0" class="text-white/50 text-center">
                暂无歌词
              </div>
              <div v-else-if="!hasTimestamp" class="text-white/70 text-center">
                当前歌词不支持滚动
              </div>
              <div v-else-if="compactLyricLine" class="max-w-full text-white font-bold">
                <div
                  class="leading-tight"
                  :class="showTranslation && compactLyricLine.translation ? 'line-clamp-1' : 'line-clamp-2'"
                  :style="{ fontSize: `${lyricsFontSize}px` }"
                  :title="compactLyricLine.text"
                >
                  {{ compactLyricLine.text }}
                </div>
                <div
                  v-if="showTranslation && compactLyricLine.translation"
                  class="leading-tight text-white/70 font-normal mt-1 line-clamp-1"
                  :style="{ fontSize: `${lyricsFontSize}px` }"
                  :title="compactLyricLine.translation"
                >
                  {{ compactLyricLine.translation }}
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="isMobileViewport || showFullscreenLyrics" class="flex-1 h-full min-w-0">
            <PlayerLyrics
              :parsed-lyrics="parsedLyrics"
              :has-timestamp="hasTimestamp"
              :current-line-index="currentLineIndex"
              :show-translation="showTranslation"
              class="h-full"
              @seek="onSeek"
            />
          </div>
        </div>

        <div v-if="!isImmersive || immersiveControlsVisible" class="relative z-10 md:hidden shrink-0 flex justify-end px-6 py-4">
          <PlayerControlMobile />
        </div>

        <div
          v-if="showSpectrum && enableAudioContext" class="absolute inset-x-0 bottom-0 z-0 pointer-events-none duration-300 ease"
          :style="{ height: `${player.spectrumSettings.height}px`, maxHeight: '30vh' }"
          :class="{ 'translate-y-[72px]': isImmersive && !immersiveControlsVisible }"
        >
          <PlayerSpectrum :active="showSpectrum && isPlaying" />
        </div>
      </div>

      <div
        v-if="isImmersive && !immersiveControlsVisible"
        class="absolute inset-x-0 bottom-0 z-20 pointer-events-none"
        aria-hidden="true"
      >
        <PlayerProgress
          :current-time="currentTime"
          :duration="duration"
          :buffered-end="bufferedEnd"
          thin
        />
      </div>

      <div
        v-if="coverMenu"
        ref="coverMenuRef"
        role="menu"
        aria-label="封面设置"
        class="fixed z-30 w-[216px] rounded-xl border border-white/20 bg-gray-900/95 p-1.5 text-white shadow-xl backdrop-blur-md"
        :style="{ left: `${coverMenu.x}px`, top: `${coverMenu.y}px` }"
        @contextmenu.prevent
      >
        <div class="px-3 py-1.5 text-xs text-white/50">
          封面形状
        </div>
        <button
          type="button"
          role="menuitemradio"
          :aria-checked="fullscreenCoverShape === 'square'"
          class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          @click="player.setFullscreenCoverShape('square'); closeCoverMenu()"
        >
          方形
          <LucideCheck v-if="fullscreenCoverShape === 'square'" class="size-4" />
        </button>
        <button
          type="button"
          role="menuitemradio"
          :aria-checked="isRoundCover"
          class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          @click="player.setFullscreenCoverShape('circle'); closeCoverMenu()"
        >
          圆形
          <LucideCheck v-if="isRoundCover" class="size-4" />
        </button>
        <div class="my-1 border-t border-white/15" />
        <button
          type="button"
          role="menuitemcheckbox"
          :aria-checked="fullscreenCoverRotation"
          :disabled="!isRoundCover"
          class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-white/40 disabled:hover:bg-transparent"
          @click="fullscreenCoverRotation = !fullscreenCoverRotation; closeCoverMenu()"
        >
          播放中封面旋转
          <LucideCheck v-if="fullscreenCoverRotation" class="size-4" />
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          :aria-checked="fullscreenCoverBorder"
          :disabled="!isRoundCover"
          class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-white/40 disabled:hover:bg-transparent"
          @click="fullscreenCoverBorder = !fullscreenCoverBorder; closeCoverMenu()"
        >
          封面边框
          <LucideCheck v-if="fullscreenCoverBorder" class="size-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.background-mask {
  background: rgba(0, 0, 0, 0.25);
}

.fullscreen-cover-border {
  position: relative;
  padding: 24px;
  box-shadow: none;
}

.fullscreen-cover-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.fullscreen-cover-image {
  display: block;
}

.fullscreen-cover-art {
  position: relative;
  z-index: 1;
}

.fullscreen-cover-spin {
  animation: fullscreen-cover-rotate 30s linear infinite;
}

.fullscreen-cover-spin-paused {
  animation-play-state: paused;
}

@keyframes fullscreen-cover-rotate {
  to { transform: rotate(360deg); }
}

.volume-slider {
  height: 4px;
  accent-color: white;
}

.fullscreen-player-enter-active,
.fullscreen-player-leave-active {
  transition: all 0.4s ease;
}
.fullscreen-player-leave-from,
.fullscreen-player-enter-to {
  transform: translateY(v-bind('transformPosition'));
}
.fullscreen-player-enter-from,
.fullscreen-player-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>

<script setup lang="ts">
import { useElementSize, useFullscreen, useMediaQuery, useWindowSize } from '@vueuse/core'
import { usePlayerCoverColors } from '@/composables/usePlayerCoverColors'
import { usePlayerLyrics } from '@/composables/usePlayerLyrics'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'
import { fallbackCoverColors } from '@/utils/cover'
import { getSleepTimerLabel } from '@/utils/sleep-timer'

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
  immersiveModeEnabled,
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
const showSleepTimer = ref(false)
const sleepTimerLabel = computed(() => getSleepTimerLabel(player.sleepTimer, player.sleepTimerNow))
const isMobileViewport = useMediaQuery('(max-width: 767px)')
const coverMenu = ref<{ x: number, y: number } | null>(null)
const coverMenuRef = ref<HTMLElement | null>(null)
const showPlayerMenu = ref(false)
const playerMenuRef = ref<HTMLElement | null>(null)
const playerMenuTriggerRef = ref<HTMLButtonElement | null>(null)
const playerMenuId = useId()
const headerStartRef = ref<HTMLElement | null>(null)
const headerEndRef = ref<HTMLElement | null>(null)
const { width: headerStartWidth } = useElementSize(headerStartRef)
const { width: headerEndWidth } = useElementSize(headerEndRef)
const headerColumns = computed(() => {
  const sideWidth = Math.max(headerStartWidth.value, headerEndWidth.value)
  return `minmax(${sideWidth}px, 1fr) minmax(0, auto) minmax(${sideWidth}px, 1fr)`
})

function closePlayerMenu(restoreFocus = false) {
  const wasOpen = showPlayerMenu.value
  showPlayerMenu.value = false
  if (restoreFocus && wasOpen)
    playerMenuTriggerRef.value?.focus()
}

function togglePlayerMenu() {
  showPlayerMenu.value = !showPlayerMenu.value
  closeCoverMenu()
  if (showPlayerMenu.value)
    nextTick(() => playerMenuRef.value?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus())
}
let coverPressTimer: ReturnType<typeof setTimeout> | null = null
let coverPressStart: { x: number, y: number } | null = null
let suppressCoverClick = false

function closeCoverMenu() {
  coverMenu.value = null
}

function openCoverMenu(x: number, y: number) {
  closePlayerMenu()
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
  if (showPlayerMenu.value && !playerMenuRef.value?.contains(event.target as Node) && !playerMenuTriggerRef.value?.contains(event.target as Node))
    closePlayerMenu()
}

function onDocumentKeyDown(event: KeyboardEvent) {
  const menu = showPlayerMenu.value ? playerMenuRef.value : coverMenu.value ? coverMenuRef.value : null
  if (!menu)
    return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeCoverMenu()
    closePlayerMenu(true)
  }
  else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[nextIndex]?.focus()
  }
  else if (event.key === 'Tab') {
    closeCoverMenu()
    closePlayerMenu(true)
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeyDown)
})

watch(isFullscreen, (value) => {
  if (!value) {
    closeCoverMenu()
    closePlayerMenu()
    showSleepTimer.value = false
  }
})
watch(currentSong, (song) => {
  if (!song)
    showSleepTimer.value = false
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
  immersiveTimer = null
  if (showPlayerMenu.value || coverMenu.value || showSleepTimer.value)
    return
  immersiveTimer = setTimeout(() => {
    player.setImmersiveControlsVisible(false)
  }, IMMERSIVE_HIDE_DELAY)
}

function onImmersiveActivity() {
  if (!isImmersive.value)
    return
  showImmersiveControls()
}

watch([isImmersive, showPlayerMenu, coverMenu, showSleepTimer], ([immersive]) => {
  if (immersive) {
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
          class="relative z-20 grid items-center gap-3 px-6 py-4 shrink-0 transition-opacity duration-300"
          :style="{ gridTemplateColumns: headerColumns }"
          :class="{ 'opacity-0': isImmersive && !immersiveControlsVisible }"
          @touchstart="onHeaderTouchStart"
          @touchmove.prevent="onHeaderTouchMove"
          @touchend="onHeaderTouchEnd"
        >
          <div ref="headerStartRef" class="flex items-center gap-1 justify-self-start">
            <Tooltip
              placement="bottom"
              align="center"
              :content="t('PlayerFullscreen.exit_fullscreen_player')"
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
              :content="isPageFullscreenSupported ? (isPageFullscreen ? t('PlayerFullscreen.exit_fullscreen') : t('PlayerFullscreen.enter_fullscreen')) : t('PlayerFullscreen.fullscreen_is_unavailable_in_this_browser')"
            >
              <button
                class="size-10 shrink-0 inline-flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                :class="{ 'opacity-40 cursor-not-allowed': !isPageFullscreenSupported }"
                :disabled="!isPageFullscreenSupported"
                :aria-label="isPageFullscreen ? t('PlayerFullscreen.exit_fullscreen') : t('PlayerFullscreen.enter_fullscreen')"
                @click="togglePageFullscreen()"
              >
                <LucideMaximize v-if="!isPageFullscreen" class="size-5" />
                <LucideMinimize v-else class="size-5" />
              </button>
            </Tooltip>
          </div>

          <div
            v-show="!isImmersive || immersiveControlsVisible"
            class="col-start-2 min-w-0 text-center text-white/60 text-sm whitespace-nowrap truncate cursor-pointer"
            @click="toAlbum"
          >
            {{ currentSong.albumName }}
          </div>

          <div ref="headerEndRef" class="relative col-start-3 justify-self-end" @touchstart.stop>
            <button
              ref="playerMenuTriggerRef"
              type="button"
              class="size-10 inline-flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              :class="{ 'bg-white/10': showPlayerMenu }"
              :aria-label="t('PlayerFullscreen.player_menu')"
              aria-haspopup="menu"
              :aria-expanded="showPlayerMenu"
              :aria-controls="showPlayerMenu ? playerMenuId : undefined"
              @click="togglePlayerMenu"
              @keydown.down.prevent="!showPlayerMenu && togglePlayerMenu()"
            >
              <LucideEllipsis class="size-5" />
            </button>
            <Transition name="player-menu">
              <div
                v-if="showPlayerMenu"
                :id="playerMenuId"
                ref="playerMenuRef"
                role="menu"
                :aria-label="t('PlayerFullscreen.player_settings')"
                class="player-popup-menu absolute right-0 top-full mt-2 origin-top-right max-h-[calc(100dvh-96px)] overflow-y-auto"
                @click="closePlayerMenu()"
              >
                <button type="button" role="menuitem" class="player-menu-item" @click="showSleepTimer = true">
                  <LucideTimer class="size-4 shrink-0" />
                  <span class="flex-1">{{ t('sleep_timer.sleep_timer') }}</span>
                  <span v-if="player.sleepTimer.status !== 'off'" class="text-xs text-blue-400">{{ sleepTimerLabel }}</span>
                </button>
                <div class="my-1 border-t border-white/15" />
                <button
                  type="button" role="menuitemcheckbox" class="player-menu-item"
                  :aria-checked="immersiveModeEnabled"
                  @click="player.setImmersiveModeEnabled(!immersiveModeEnabled)"
                >
                  <LucideFocus class="size-4 shrink-0" />
                  <span class="flex-1">{{ t('Settings.immersive_mode') }}</span>
                  <LucideCheck v-if="immersiveModeEnabled" class="size-4 text-blue-400" />
                </button>
                <button
                  v-if="!isMobileViewport"
                  type="button" role="menuitemcheckbox" class="player-menu-item"
                  :aria-checked="showFullscreenLyrics"
                  @click="player.toggleFullscreenLyrics()"
                >
                  <LucideScrollText class="size-4 shrink-0" />
                  <span class="flex-1">{{ t('PlayerFullscreen.show_lyrics') }}</span>
                  <LucideCheck v-if="showFullscreenLyrics" class="size-4 text-blue-400" />
                </button>
                <button
                  type="button" role="menuitemcheckbox" class="player-menu-item"
                  :aria-checked="showTranslation" :disabled="!lyricTranslation"
                  :title="!lyricTranslation ? t('PlayerFullscreen.no_translated_lyrics_for_this_song') : undefined"
                  @click="player.toggleTranslation()"
                >
                  <LucideLanguages class="size-4 shrink-0" />
                  <span class="flex-1">{{ t('PlayerFullscreen.translated_lyrics') }}</span>
                  <LucideCheck v-if="showTranslation" class="size-4" :class="lyricTranslation ? 'text-blue-400' : 'text-white/40'" />
                </button>
                <button
                  type="button" role="menuitemcheckbox" class="player-menu-item"
                  :aria-checked="showSpectrum" :disabled="!enableAudioContext"
                  :title="!enableAudioContext ? t('PlayerFullscreen.enable_audio_visualization_in_settings_first') : undefined"
                  @click="player.toggleSpectrum()"
                >
                  <LucideAudioLines class="size-4 shrink-0" />
                  <span class="flex-1">{{ t('PlayerFullscreen.spectrum_visualization') }}</span>
                  <LucideCheck v-if="showSpectrum" class="size-4" :class="enableAudioContext ? 'text-blue-400' : 'text-white/40'" />
                </button>
              </div>
            </Transition>
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
                :alt="t('PlayerFullscreen.cover', { p0: currentSong.songName })"
              />
            </div>
            <div class="mt-4 text-center">
              <div class="text-white text-xl font-bold truncate cursor-pointer" :title="currentSong.songName" @click="toSong">
                {{ currentSong.songName }}
              </div>
              <div v-if="currentSong.songDescription" class="text-white/50 text-sm mt-1">
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
              :aria-label="t('PlayerFullscreen.switch_to_full_lyrics_layout')"
              :title="t('PlayerFullscreen.switch_to_full_lyrics_layout')"
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
                :alt="t('PlayerFullscreen.cover', { p0: currentSong.songName })"
              />
            </button>

            <div class="w-full max-w-[min(88vw,520px)] min-h-[3.5rem] text-center flex items-center justify-center px-2">
              <div v-if="parsedLyrics.length === 0" class="text-white/50 text-center">
                {{ t('PlayerFullscreen.no_lyrics') }}
              </div>
              <div v-else-if="!hasTimestamp" class="text-white/70 text-center">
                {{ t('PlayerFullscreen.these_lyrics_do_not_support_scrolling') }}
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

      <Transition name="player-menu">
        <div
          v-if="coverMenu"
          ref="coverMenuRef"
          role="menu"
          :aria-label="t('PlayerFullscreen.cover_settings')"
          class="player-popup-menu fixed z-30 origin-top-left"
          :style="{ left: `${coverMenu.x}px`, top: `${coverMenu.y}px` }"
          @contextmenu.prevent
        >
          <div class="px-3 py-1.5 text-xs text-white/50">
            {{ t('PlayerFullscreen.cover_shape') }}
          </div>
          <button
            type="button"
            role="menuitemradio"
            :aria-checked="fullscreenCoverShape === 'square'"
            class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
            @click="player.setFullscreenCoverShape('square'); closeCoverMenu()"
          >
            {{ t('Settings.square') }}<LucideCheck v-if="fullscreenCoverShape === 'square'" class="size-4" />
          </button>
          <button
            type="button"
            role="menuitemradio"
            :aria-checked="isRoundCover"
            class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
            @click="player.setFullscreenCoverShape('circle'); closeCoverMenu()"
          >
            {{ t('Settings.circle') }}<LucideCheck v-if="isRoundCover" class="size-4" />
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
            {{ t('Settings.rotate_cover_during_playback') }}<LucideCheck v-if="fullscreenCoverRotation" class="size-4" />
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            :aria-checked="fullscreenCoverBorder"
            :disabled="!isRoundCover"
            class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-white/40 disabled:hover:bg-transparent"
            @click="fullscreenCoverBorder = !fullscreenCoverBorder; closeCoverMenu()"
          >
            {{ t('Settings.cover_border') }}<LucideCheck v-if="fullscreenCoverBorder" class="size-4" />
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
  <PlayerSleepTimer v-model="showSleepTimer" />
</template>

<style scoped>
.player-popup-menu {
  width: 216px;
  max-width: calc(100vw - 16px);
  border-radius: 12px;
  border: 1px solid rgb(255 255 255 / 20%);
  background: rgb(17 24 39 / 95%);
  padding: 6px;
  color: white;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 10%), 0 8px 10px -6px rgb(0 0 0 / 10%);
  backdrop-filter: blur(12px);
}

.player-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.player-menu-item:hover,
.player-menu-item:focus-visible {
  background: rgb(255 255 255 / 10%);
  outline: none;
}

.player-menu-item:disabled {
  color: rgb(255 255 255 / 40%);
  background: transparent;
  cursor: not-allowed;
}

.player-menu-enter-active {
  transition: opacity 180ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.player-menu-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
  pointer-events: none;
}

.player-menu-enter-from,
.player-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .player-menu-enter-active,
  .player-menu-leave-active {
    transition: opacity 0.01ms;
  }
}

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

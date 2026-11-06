<script setup lang="ts">
import type { LyricLine } from '@/utils'
import { useElementSize } from '@vueuse/core'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import PlayerLyrics from './PlayerLyrics.vue'

defineProps<{ parsedLyrics: LyricLine[], hasTimestamp: boolean, currentLineIndex: number }>()
defineEmits<{
  close: []
  toSong: []
  toAlbum: []
  sleep: []
  headerTouchStart: [event: TouchEvent]
  headerTouchMove: [event: TouchEvent]
  headerTouchEnd: [cancelled?: boolean]
}>()
const player = usePlayerStore()
const { currentSong, mobileFullscreenLayout, showTranslation, isImmersive, immersiveControlsVisible, lyricsFontSize } = storeToRefs(player)
const controlsHidden = computed(() => isImmersive.value && !immersiveControlsVisible.value)
let suppressActivityClick = false

function onArtPointerDown() {
  suppressActivityClick = controlsHidden.value
}

function onArtClick(event: MouseEvent) {
  const suppress = suppressActivityClick
  suppressActivityClick = false
  if (suppress && event.detail > 0) {
    event.preventDefault()
    event.stopPropagation()
  }
}
const songTitle = useTemplateRef<HTMLElement>('songTitle')
const songTitleText = useTemplateRef<HTMLElement>('songTitleText')
const { width: titleWidth } = useElementSize(songTitle)
const { width: titleTextWidth } = useElementSize(songTitleText)
const titleOverflows = computed(() => titleWidth.value > 0 && titleTextWidth.value > titleWidth.value + 1)
const titleScrollStyle = computed(() => ({
  '--title-scroll-distance': `${-(titleTextWidth.value + 32)}px`,
  '--title-scroll-duration': `${(titleTextWidth.value + 32) / 32 + 2}s`,
}))
const artArea = useTemplateRef<HTMLElement>('artArea')
const { width, height } = useElementSize(artArea)
// Reserve two 1.25-line-height lines plus the translation gap, independent of the current lyric.
const lyricHeight = computed(() => Math.max(48, lyricsFontSize.value * 2.5 + 4))
const coverSize = computed(() => Math.max(72, Math.min(width.value, height.value - lyricHeight.value - 20, 440)))
</script>

<template>
  <div class="mobile-fullscreen relative z-10 flex-1 min-h-0 text-white">
    <header
      class="mobile-heading"
      @touchstart="$emit('headerTouchStart', $event)" @touchmove.prevent="$emit('headerTouchMove', $event)" @touchend="$emit('headerTouchEnd')" @touchcancel="$emit('headerTouchEnd', true)"
    >
      <div class="mobile-heading-actions flex items-center justify-between">
        <button type="button" class="mobile-icon -ml-2" :aria-label="t('PlayerFullscreen.exit_fullscreen_player')" @click="$emit('close')">
          <LucideChevronDown class="size-6" />
        </button>
        <FavoriteButton v-if="currentSong" type="song" :song-id="currentSong.songId" size="md" class="shrink-0 min-w-11 min-h-11 -mr-2 text-white!" />
      </div>
      <div class="mobile-song-info min-w-0 transition-opacity duration-300" :class="{ 'opacity-0 pointer-events-none': controlsHidden }" :inert="controlsHidden">
        <button ref="songTitle" type="button" class="song-title block w-full overflow-hidden whitespace-nowrap text-left text-[22px] leading-tight font-semibold cursor-pointer" :aria-label="currentSong?.songName" :title="currentSong?.songName" @touchstart.stop @touchmove.stop @click="$emit('toSong')">
          <span
            :key="`${currentSong?.songId}:${currentSong?.songName}`"
            class="song-title-track" :class="{ 'song-title-scrolling': titleOverflows, 'song-title-paused': controlsHidden }" :style="titleScrollStyle"
          >
            <span ref="songTitleText" class="shrink-0">{{ currentSong?.songName }}</span>
            <span v-if="titleOverflows" class="shrink-0" aria-hidden="true">{{ currentSong?.songName }}</span>
          </span>
        </button>
        <button type="button" class="mt-2 block max-w-full truncate text-sm text-white/60 cursor-pointer" @touchstart.stop @touchmove.stop @click="$emit('toAlbum')">
          {{ currentSong?.albumName }}
        </button>
      </div>
    </header>
    <div
      ref="artArea"
      class="mobile-art min-h-0 min-w-0" :class="{ 'pt-4': mobileFullscreenLayout === 'cover' }"
      @pointerdown.capture="onArtPointerDown" @click.capture="onArtClick"
    >
      <div v-if="mobileFullscreenLayout === 'cover'" class="h-full flex flex-col items-center justify-center gap-5">
        <div class="shrink-0 max-w-full aspect-square" :style="{ width: `${coverSize}px`, height: `${coverSize}px` }">
          <slot name="cover" />
        </div>
        <div class="w-full shrink-0 overflow-hidden text-center" :style="{ height: `${lyricHeight}px` }">
          <slot name="lyric" />
        </div>
      </div>
      <PlayerLyrics v-else :parsed-lyrics="parsedLyrics" :has-timestamp="hasTimestamp" :current-line-index="currentLineIndex" :show-translation="showTranslation" controls-on-scroll-only class="h-full" @seek="player.seek" />
    </div>
    <div class="mobile-controls">
      <PlayerControlMobile :controls-hidden="controlsHidden" @sleep="$emit('sleep')">
        <template #more>
          <slot name="more" />
        </template>
      </PlayerControlMobile>
    </div>
  </div>
</template>

<style scoped>
.song-title-track {
  display: inline-flex;
  gap: 32px;
  vertical-align: top;
}
.song-title-scrolling {
  animation: song-title-scroll var(--title-scroll-duration) linear infinite;
}
.song-title-paused {
  animation-play-state: paused;
}
@keyframes song-title-scroll {
  0%, 10% { transform: translateX(0); }
  100% { transform: translateX(var(--title-scroll-distance)); }
}
.mobile-fullscreen {
  --mobile-inline-padding: 28px;
  --mobile-top-padding: max(8px, env(safe-area-inset-top));
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(180px, 1fr) auto;
  gap: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--mobile-top-padding) var(--mobile-inline-padding) max(8px, env(safe-area-inset-bottom));
}
.mobile-heading {
  grid-area: 1 / 1;
}
.mobile-heading-actions {
  margin: calc(-1 * var(--mobile-top-padding)) calc(-1 * var(--mobile-inline-padding)) 8px;
  padding: var(--mobile-top-padding) var(--mobile-inline-padding) 0;
  touch-action: none;
}
.mobile-art {
  grid-area: 2 / 1;
}
.mobile-controls {
  grid-area: 3 / 1;
}
.mobile-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
}
.mobile-icon:active {
  background: rgb(255 255 255 / 10%);
}
@media (max-height: 700px) {
  .mobile-fullscreen {
    gap: 4px;
    --mobile-inline-padding: 24px;
  }
}
@media (max-width: 359px) {
  .mobile-fullscreen {
    --mobile-inline-padding: 20px;
  }
}
@media (orientation: landscape) and (max-height: 520px) {
  .mobile-fullscreen {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto minmax(180px, 1fr);
    column-gap: 28px;
  }
  .mobile-heading {
    grid-column: 2;
    grid-row: 1;
  }
  .mobile-art {
    grid-column: 1;
    grid-row: 1 / 3;
  }
  .mobile-controls {
    grid-column: 2;
    grid-row: 2;
    align-self: end;
  }
}
@media (prefers-reduced-motion: reduce) {
  .song-title { text-overflow: ellipsis; }
  .song-title-track { display: inline; animation: none; }
  .song-title-track > [aria-hidden] { display: none; }
  .mobile-song-info {
    transition: none;
  }
}
</style>

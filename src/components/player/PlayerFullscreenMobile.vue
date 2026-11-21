<script setup lang="ts">
import type { LyricLine } from '@/utils'
import { useElementSize } from '@vueuse/core'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import PlayerControlMobile from './PlayerControlMobile.vue'
import PlayerLyrics from './PlayerLyrics.vue'
import PlayerScrollingText from './PlayerScrollingText.vue'

const props = defineProps<{ parsedLyrics: LyricLine[], hasTimestamp: boolean, currentLineIndex: number, wordLyricAuthors: string[] }>()
const emit = defineEmits<{
  activity: []
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
    emit('activity')
  }
}
const compactLyricIndex = computed(() => Math.max(0, props.currentLineIndex))
const compactLyricLine = computed(() => props.hasTimestamp ? props.parsedLyrics[compactLyricIndex.value] : undefined)
const songInfo = useTemplateRef<HTMLElement>('songInfo')
const { height: songInfoHeight } = useElementSize(songInfo)
const controls = useTemplateRef<InstanceType<typeof PlayerControlMobile>>('controls')
const artArea = useTemplateRef<HTMLElement>('artArea')
const { width, height } = useElementSize(artArea)
// Reserve two 1.25-line-height lines plus the translation gap, independent of the current lyric.
const lyricHeight = computed(() => Math.max(48, lyricsFontSize.value * 2.5 + 4))
const coverSize = computed(() => Math.max(72, Math.min(width.value, height.value - lyricHeight.value - 20, 440)))
</script>

<template>
  <div class="mobile-fullscreen relative z-10 flex-1 min-h-0 text-white" :class="{ 'mobile-immersive-lyrics': controlsHidden && mobileFullscreenLayout === 'lyrics' }">
    <header
      class="mobile-heading"
      :class="{ invisible: controlsHidden }"
      :inert="controlsHidden"
      @touchstart="$emit('headerTouchStart', $event)" @touchmove.prevent="$emit('headerTouchMove', $event)" @touchend="$emit('headerTouchEnd')" @touchcancel="$emit('headerTouchEnd', true)"
    >
      <div class="mobile-heading-actions flex items-center justify-between">
        <button type="button" class="mobile-icon -ml-2" :aria-label="t('PlayerFullscreen.exit_fullscreen_player')" @click="$emit('close')">
          <LucideChevronDown class="size-6" />
        </button>
        <FavoriteButton v-if="currentSong" type="song" :song-id="currentSong.songId" size="md" class="shrink-0 min-w-11 min-h-11 -mr-2 text-white!" />
      </div>
      <div ref="songInfo" class="min-w-0">
        <button type="button" class="block w-full text-left text-[22px] leading-tight font-semibold cursor-pointer" :aria-label="currentSong?.songName" :title="currentSong?.songName" @touchstart.stop @touchmove.stop @click="$emit('toSong')">
          <PlayerScrollingText :key="currentSong?.songId" :text="currentSong?.songName ?? ''" :paused="controlsHidden" />
        </button>
        <button type="button" class="mt-2 block max-w-full truncate text-sm text-white/60 cursor-pointer" @touchstart.stop @touchmove.stop @click="$emit('toAlbum')">
          {{ currentSong?.albumName }}
        </button>
      </div>
    </header>
    <div
      ref="artArea"
      class="mobile-art relative min-h-0 min-w-0" :class="{ 'pt-4': mobileFullscreenLayout === 'cover' }"
      @pointerdown.capture="onArtPointerDown" @click.capture="onArtClick"
    >
      <div v-if="mobileFullscreenLayout === 'cover'" class="h-full flex flex-col items-center justify-center gap-5">
        <div class="shrink-0 max-w-full aspect-square" :style="{ width: `${coverSize}px`, height: `${coverSize}px` }">
          <slot name="cover" />
        </div>
        <div class="w-full shrink-0 overflow-hidden text-center" :style="{ height: `${lyricHeight}px` }">
          <div v-if="compactLyricLine" :key="compactLyricIndex" class="leading-tight">
            <PlayerScrollingText :text="compactLyricLine.text" :title="compactLyricLine.text" :style="{ fontSize: `${lyricsFontSize}px` }" />
            <PlayerScrollingText
              v-if="showTranslation && compactLyricLine.translation"
              class="mt-1 text-white/70"
              :text="compactLyricLine.translation"
              :title="compactLyricLine.translation"
              :style="{ fontSize: `${lyricsFontSize - 2}px` }"
            />
          </div>
        </div>
      </div>
      <PlayerLyrics
        v-else
        :word-lyric-authors="wordLyricAuthors" :parsed-lyrics="parsedLyrics" :has-timestamp="hasTimestamp" :current-line-index="currentLineIndex" :show-translation="showTranslation"
        :font-viewport-height="height" controls-on-scroll-only class="mobile-lyrics"
        :style="{ '--song-info-height': `${songInfoHeight}px`, '--progress-height': `${controls?.progressHeight ?? 0}px` }"
        @seek="player.seek" @user-scroll="emit('activity')"
      />
    </div>
    <div class="mobile-controls">
      <PlayerControlMobile ref="controls" :controls-hidden="controlsHidden" @sleep="$emit('sleep')">
        <template #more>
          <slot name="more" />
        </template>
      </PlayerControlMobile>
    </div>
  </div>
</template>

<style scoped>
.mobile-fullscreen {
  --mobile-inline-padding: 28px;
  --mobile-top-padding: max(8px, env(safe-area-inset-top));
  --mobile-row-gap: 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(180px, 1fr) auto;
  gap: var(--mobile-row-gap);
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
.mobile-lyrics {
  position: absolute;
  inset: 0;
  height: auto;
}
.mobile-immersive-lyrics .mobile-lyrics {
  top: calc(-1 * (var(--mobile-row-gap) + var(--song-info-height)));
  bottom: calc(-1 * (var(--mobile-row-gap) + var(--progress-height)));
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
    --mobile-row-gap: 4px;
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
  .mobile-immersive-lyrics .mobile-lyrics {
    inset: 0;
  }
}
</style>

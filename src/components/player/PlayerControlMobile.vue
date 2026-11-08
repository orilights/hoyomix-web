<script setup lang="ts">
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { formatDuration } from '@/utils'
import { getSleepTimerLabel } from '@/utils/sleep-timer'

defineProps<{ controlsHidden: boolean }>()
defineEmits<{ sleep: [] }>()
const player = usePlayerStore()
const { currentTime, duration, bufferedEnd, mobileFullscreenLayout, isPlaying, isLoading, playMode, showPlaylist } = storeToRefs(player)
const playLabel = computed(() => isLoading.value ? t('PlayerPlayBtn.loading_please_wait') : isPlaying.value ? t('PlayerPlayBtn.pause') : t('MusicActions.play'))
const modeLabel = computed(() => ({ sequential: t('PlayerBar.play_in_order'), loop: t('PlayerBar.repeat_all'), single: t('PlayerBar.repeat_one'), shuffle: t('DesktopSidebar.shuffle') })[playMode.value])
const timerLabel = computed(() => getSleepTimerLabel(player.sleepTimer, player.sleepTimerNow))
</script>

<template>
  <div>
    <div class="mobile-progress transition-opacity duration-300" :class="{ 'opacity-0 pointer-events-none': controlsHidden }" :inert="controlsHidden">
      <PlayerProgress :current-time="currentTime" :duration="duration" :buffered-end="bufferedEnd" touch-friendly @seek="player.seek" />
      <div class="flex justify-between text-xs text-white/60 tabular-nums -mt-1 pointer-events-none">
        <span>{{ formatDuration(Math.floor(currentTime)) }}</span><span>{{ formatDuration(Math.floor(duration)) }}</span>
      </div>
    </div>
    <!-- 点击时再唤醒界面，避免触摸阶段显示控件导致首次点击被浏览器吞掉。 -->
    <div class="mobile-transport flex items-center justify-center gap-7" @touchstart.stop @mousemove.stop>
      <button type="button" class="control-button" :aria-label="t('MusicActions.previous_song')" :disabled="playMode === 'shuffle' && !player.hasPrev" @click="player.playPrev()">
        <LucideSkipBack class="size-6" fill="currentColor" />
      </button>
      <button type="button" class="control-button main-play" :aria-label="playLabel" :aria-busy="isLoading" @click="player.togglePlay()">
        <LucideLoader2 v-if="isLoading" class="size-8 animate-spin" />
        <LucidePause v-else-if="isPlaying" class="size-9" fill="currentColor" stroke-width="0.5" />
        <LucidePlay v-else class="size-9" fill="currentColor" />
      </button>
      <button type="button" class="control-button" :aria-label="t('MusicActions.next_song')" @click="player.playNext()">
        <LucideSkipForward class="size-6" fill="currentColor" />
      </button>
    </div>
    <div class="mobile-tools flex items-center justify-between gap-1 transition-opacity duration-300" :class="{ 'opacity-0 pointer-events-none': controlsHidden }" :inert="controlsHidden">
      <button type="button" class="control-button" :aria-label="modeLabel" :title="modeLabel" @click="player.togglePlayMode()">
        <LucideListEnd v-if="playMode === 'sequential'" class="size-5" /><LucideRepeat v-else-if="playMode === 'loop'" class="size-5" /><LucideRepeat1 v-else-if="playMode === 'single'" class="size-5" /><LucideShuffle v-else class="size-5" />
      </button>
      <button type="button" class="control-button relative" :class="{ 'text-blue-400': player.sleepTimer.status !== 'off' }" :aria-label="timerLabel" :title="timerLabel" @click="$emit('sleep')">
        <LucideTimer class="size-5" /><span v-if="player.sleepTimer.status !== 'off'" class="absolute right-1 top-1 size-1.5 rounded-full bg-blue-400" />
      </button>
      <button type="button" class="control-button" :class="{ 'text-blue-400': mobileFullscreenLayout === 'lyrics' }" :aria-label="mobileFullscreenLayout === 'lyrics' ? t('PlayerControlMobile.view_cover') : t('PlayerControlMobile.view_lyrics')" :aria-pressed="mobileFullscreenLayout === 'lyrics'" @click="player.setMobileFullscreenLayout(mobileFullscreenLayout === 'lyrics' ? 'cover' : 'lyrics')">
        <LucideScrollText class="size-5" />
      </button>
      <button type="button" class="control-button" :aria-label="t('PlayerBar.queue')" :aria-expanded="showPlaylist" @click="showPlaylist = !showPlaylist">
        <LucideListVideo class="size-5" />
      </button>
      <slot name="more" />
    </div>
  </div>
</template>

<style scoped>
.control-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease;
}
.control-button:active {
  background: rgb(255 255 255 / 10%);
  transform: scale(0.94);
}
.control-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.main-play {
  width: 52px;
  height: 52px;
}
.mobile-transport {
  padding-block: 6px;
  transform: translateY(-10px);
}
.mobile-tools {
  padding-top: 0;
}
@media (max-height: 700px) {
  .mobile-transport {
    padding-block: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .control-button, .mobile-progress, .mobile-tools {
    transition: none;
  }
  .control-button:active {
    transform: none;
  }
}
</style>

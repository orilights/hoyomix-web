<script setup lang="ts">
import { usePlayerStore } from '@/store/player'
import { isIOS } from '@/utils'

const player = usePlayerStore()
const { volume, mobileFullscreenLayout } = storeToRefs(player)
</script>

<template>
  <div class="flex items-center gap-5 max-w-full bg-black/40 backdrop-blur-md rounded-full px-6 py-3">
    <button
      type="button"
      class="shrink-0 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white rounded"
      @click="player.setMobileFullscreenLayout(mobileFullscreenLayout === 'lyrics' ? 'cover' : 'lyrics')"
    >
      {{ mobileFullscreenLayout === 'lyrics' ? '查看封面' : '查看歌词' }}
    </button>
    <input
      v-if="!isIOS()"
      type="range"
      :value="volume"
      min="0"
      max="1"
      step="0.01"
      class="volume-slider min-w-0"
      @input="player.setVolume(Number(($event.target as HTMLInputElement).value))"
    >
    <button class="text-gray-400 hover:text-white transition-colors cursor-pointer" @click="player.playPrev()">
      <LucideSkipBack class="size-6" fill="currentColor" />
    </button>
    <button class="text-gray-400 hover:text-white transition-colors cursor-pointer" @click="player.playNext()">
      <LucideSkipForward class="size-6" fill="currentColor" />
    </button>
  </div>
</template>

<style scoped>

</style>

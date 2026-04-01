<script setup lang="ts">
import { usePlayerStore } from '@/store/player'

const player = usePlayerStore()
const { volume } = storeToRefs(player)
</script>

<template>
  <div class="flex items-center gap-5 bg-black/40 backdrop-blur-md rounded-full px-6 py-3">
    <input
      type="range"
      :value="volume"
      min="0"
      max="1"
      step="0.01"
      class="volume-slider"
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

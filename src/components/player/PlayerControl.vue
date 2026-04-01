<script setup lang="ts">
import { usePlayerStore } from '@/store/player'
import { formatDuration } from '@/utils'

const player = usePlayerStore()
const { currentTime, duration, bufferedEnd } = storeToRefs(player)
</script>

<template>
  <div class="flex flex-col items-center flex-1 gap-1 shrink-0">
    <div class="flex items-center gap-4">
      <Tooltip content="上一首" placement="top" align="center">
        <button
          class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
          @click="player.playPrev()"
        >
          <LucideSkipBack class="size-5" fill="currentColor" />
        </button>
      </Tooltip>

      <PlayerPlayBtn />

      <Tooltip content="下一首" placement="top" align="center">
        <button
          class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
          @click="player.playNext()"
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
        @seek="player.seek"
      />
      <span class="text-white/50 text-xs w-10 shrink-0">
        {{ formatDuration(Math.floor(duration)) }}
      </span>
    </div>
  </div>
</template>

<style scoped>

</style>

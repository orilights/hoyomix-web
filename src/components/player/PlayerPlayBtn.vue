<script setup lang="ts">
import { usePlayerStore } from '@/store/player'

const player = usePlayerStore()
const { isPlaying, isLoading } = storeToRefs(player)

const playBtnTip = computed(() => {
  if (isLoading.value)
    return '加载中，请稍后'
  return isPlaying.value ? '暂停' : '播放'
})
</script>

<template>
  <Tooltip :content="playBtnTip" placement="top" align="center">
    <button
      class="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
      @click="player.togglePlay()"
    >
      <LucideLoader2 v-if="isLoading" class="size-5 animate-spin" />
      <LucidePlay v-else-if="!isPlaying" class="size-5" fill="currentColor" />
      <LucidePause v-else class="size-5" fill="currentColor" stroke-width="0.5" />
    </button>
  </Tooltip>
</template>

<style scoped>

</style>

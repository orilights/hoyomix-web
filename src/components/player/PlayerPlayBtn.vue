<script setup lang="ts">
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'

const player = usePlayerStore()
const { isPlaying, isLoading } = storeToRefs(player)

const playBtnTip = computed(() => {
  if (isLoading.value)
    return t('PlayerPlayBtn.loading_please_wait')
  return isPlaying.value ? t('PlayerPlayBtn.pause') : t('MusicActions.play')
})
</script>

<template>
  <Tooltip :content="playBtnTip" placement="top" align="center">
    <button
      :aria-label="playBtnTip"
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

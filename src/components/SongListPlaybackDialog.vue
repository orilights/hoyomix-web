<script setup lang="ts">
import type { PlaylistSongItem } from '@/types/core'
import type { SongListPlayBehavior } from '@/types/player'
import { toast } from 'vue-sonner'
import { usePlayerStore } from '@/store/player'

interface PlaybackRequest {
  songId: number
  loadSong: () => Promise<PlaylistSongItem>
  loadSongs: () => Promise<PlaylistSongItem[]>
  loadingMessage?: string
}

const player = usePlayerStore()
const visible = ref(false)
const rememberChoice = ref(false)
const pendingRequest = ref<PlaybackRequest | null>(null)
const isBusy = ref(false)

function play(request: PlaybackRequest) {
  if (isBusy.value)
    return
  if (player.songListPlayBehavior === 'ask') {
    pendingRequest.value = request
    rememberChoice.value = false
    visible.value = true
    return
  }
  void run(player.songListPlayBehavior, request)
}

function choose(behavior: Exclude<SongListPlayBehavior, 'ask'>) {
  const request = pendingRequest.value
  if (!request || isBusy.value)
    return
  if (rememberChoice.value)
    player.setSongListPlayBehavior(behavior)
  visible.value = false
  pendingRequest.value = null
  void run(behavior, request)
}

async function run(behavior: Exclude<SongListPlayBehavior, 'ask'>, request: PlaybackRequest) {
  isBusy.value = true
  const loadingToast = request.loadingMessage ? toast.loading(request.loadingMessage) : null
  try {
    if (behavior === 'replace') {
      const songs = await request.loadSongs()
      const index = songs.findIndex(song => song.songId === request.songId)
      if (index === -1)
        throw new Error('所选歌曲不在当前列表中')
      await player.replacePlaylist([...songs], index)
      toast.success('已替换播放列表并播放')
    }
    else {
      const song = await request.loadSong()
      const wasCurrent = player.currentSong?.songId === song.songId
      await player.insertNextAndPlay(song)
      toast.success(wasCurrent ? '已重新播放当前歌曲' : '已插入下一首并播放')
    }
  }
  catch (error) {
    toast.error(`播放失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    if (loadingToast !== null)
      toast.dismiss(loadingToast)
    isBusy.value = false
  }
}

watch(visible, (open) => {
  if (!open)
    pendingRequest.value = null
})

defineExpose({ play })
</script>

<template>
  <AppDialog v-model="visible" title="选择播放方式" size="md">
    <div class="p-5 space-y-3">
      <button
        class="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:dark:bg-blue-500/15 transition-colors cursor-pointer"
        @click="choose('replace')"
      >
        <span class="block font-medium">替换播放列表并播放</span>
      </button>
      <button
        class="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:dark:bg-blue-500/15 transition-colors cursor-pointer"
        @click="choose('insert-next')"
      >
        <span class="block font-medium">插入到下一首并播放</span>
      </button>
      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
        <input v-model="rememberChoice" type="checkbox" class="accent-blue-500">
        记住选择，下次不再询问
      </label>
    </div>
  </AppDialog>
</template>

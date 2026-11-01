<script setup lang="ts">
import type { PlaylistSongItem } from '@/types/core'

import type { SongListPlayBehavior } from '@/types/player'
import { toast } from 'vue-sonner'
import { t } from '@/i18n'
import { LocalizedError } from '@/i18n/error'
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
        throw new LocalizedError('SongListPlaybackDialog.the_selected_song_is_no_longer_in_this_list')
      await player.replacePlaylist([...songs], index)
      toast.success(t('SongListPlaybackDialog.queue_replaced_and_playback_started'))
    }
    else {
      const song = await request.loadSong()
      const wasCurrent = player.currentSong?.songId === song.songId
      await player.insertNextAndPlay(song)
      toast.success(wasCurrent ? t('SongListPlaybackDialog.current_song_restarted') : t('SongListPlaybackDialog.playing_next'))
    }
  }
  catch (error) {
    toast.error(t('SongListPlaybackDialog.playback_failed', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
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
  <AppDialog v-model="visible" :close-on-click-overlay="false" :title="t('SongListPlaybackDialog.choose_playback_action')" size="md">
    <div class="p-5 space-y-3">
      <button
        class="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:dark:bg-blue-500/15 transition-colors cursor-pointer"
        @click="choose('replace')"
      >
        <span class="block font-medium">{{ t('SongListPlaybackDialog.replace_queue_and_play') }}</span>
      </button>
      <button
        class="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:dark:bg-blue-500/15 transition-colors cursor-pointer"
        @click="choose('insert-next')"
      >
        <span class="block font-medium">{{ t('MusicActions.play_next') }}</span>
      </button>
      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
        <input v-model="rememberChoice" type="checkbox" class="accent-blue-500">{{ t('SongListPlaybackDialog.remember_my_choice') }}</label>
    </div>
  </AppDialog>
</template>

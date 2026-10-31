<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { toast } from 'vue-sonner'
import { getPlaylistDetailApi, updatePlaylistSongsApi } from '@/api/music'
import { useMyPlaylistsQuery } from '@/composables/queries'
import { t } from '@/i18n'
import { useMainStore } from '@/store/main'
import { getCoverUrl } from '@/utils'

const props = defineProps<{
  songIds: number[]
  mode?: 'add' | 'overwrite'
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = defineModel<boolean>({ required: true })

const store = useMainStore()
const { albumList } = storeToRefs(store)

const { data: playlists, isPending: loading, isError, refetch } = useMyPlaylistsQuery(visible)
const submitting = ref(false)

function getCover(playlist: PlaylistListItem) {
  if (!playlist.coverAlbumId)
    return ''
  const album = albumList.value.find(a => a.id === playlist.coverAlbumId)
  return album ? getCoverUrl(album.platforms, '96px') : ''
}

async function select(playlist: PlaylistListItem) {
  submitting.value = true
  try {
    let finalIds: number[]
    if (props.mode === 'overwrite') {
      finalIds = props.songIds
    }
    else {
      const detail = await getPlaylistDetailApi(playlist.id)
      const existing = detail.songs.map(s => s.songId)
      const newIds = props.songIds.filter(id => !existing.includes(id))
      finalIds = [...existing, ...newIds]
    }
    await updatePlaylistSongsApi(playlist.id, finalIds)
    toast.success(props.mode === 'overwrite' ? t('CreatePlaylistDialog.playlist_updated') : t('SelectPlaylistDialog.added_to_playlist'))
    visible.value = false
    emit('success')
  }
  catch (error) {
    toast.error(t('SelectPlaylistDialog.action_failed', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible">
    <template #title>
      {{ mode === 'overwrite' ? t('SelectPlaylistDialog.replace_playlist') : t('AlbumActions.add_to_playlist') }}
    </template>

    <div class="max-h-80 overflow-y-auto">
      <AsyncFade>
        <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-gray-400" role="status">
          <LucideLoader2 class="size-6 text-gray-400 animate-spin" />{{ t('App.loading') }}
        </div>
        <div v-else-if="isError" class="py-10 text-center text-sm text-gray-400" role="alert">
          {{ t('Music.failed_to_load_playlist') }}<AppButton size="sm" variant="ghost" @click="refetch()">
            {{ t('App.retry') }}
          </AppButton>
        </div>
        <div v-else-if="!playlists?.length" class="py-10 text-center text-sm text-gray-400">
          {{ t('DesktopSidebar.no_playlists') }}
        </div>
        <div v-else>
          <button
            v-for="pl in playlists"
            :key="pl.id"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 hover:dark:bg-gray-800 cursor-pointer transition-colors disabled:opacity-50"
            :disabled="submitting"
            @click="select(pl)"
          >
            <div class="size-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
              <LazyImg v-if="getCover(pl)" class="size-full rounded-lg" :src="getCover(pl)" />
              <div v-else class="size-full flex items-center justify-center">
                <LucideMusic class="size-5 text-gray-300" />
              </div>
            </div>
            <div class="text-left min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ pl.name }}
              </p>
              <p class="text-xs text-gray-400">
                {{ t('Random.song_alternate', { p0: pl.songCount }, Number(pl.songCount)) }}
              </p>
            </div>
            <LucideChevronRight class="size-4 text-gray-300 ml-auto shrink-0" />
          </button>
        </div>
      </AsyncFade>
    </div>

    <template #footer>
      <p class="px-5 py-3 text-xs text-gray-400 text-center">
        {{ mode === 'overwrite' ? t('SelectPlaylistDialog.selecting_a_playlist_will_replace_all_its_songs') : t('SelectPlaylistDialog.add_song', { p0: songIds.length }, Number(songIds.length)) }}
      </p>
    </template>
  </AppDialog>
</template>

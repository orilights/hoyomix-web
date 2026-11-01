<script setup lang="ts">
import type { AlbumListItemInfo, ArtistInfo, PlaylistSongItem } from '@/types/core'

import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { getAlbumInfoApi } from '@/api/music'
import SongListPlaybackDialog from '@/components/SongListPlaybackDialog.vue'
import { registerSongList } from '@/composables/useSongLocator'
import { formatNumber, t } from '@/i18n'
import { LocalizedError } from '@/i18n/error'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'
import { buildPlaylistItem } from '@/utils/player-utils'
import { getPublishDate } from '@/utils/time'

const props = defineProps<{
  albumsList: AlbumListItemInfo[]
  artistInfo: ArtistInfo
  selectedRole?: string | null
  selectedProduct?: string | null
}>()

const player = usePlayerStore()
const queryClient = useQueryClient()
const playbackDialog = useTemplateRef<InstanceType<typeof SongListPlaybackDialog>>('playbackDialog')

function loadAlbum(albumId: number) {
  return queryClient.fetchQuery({
    queryKey: ['albumInfo', albumId],
    queryFn: () => getAlbumInfoApi(albumId),
  })
}

const sortedAlbumsList = computed(() => {
  return [...props.albumsList].sort((a, b) => {
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  })
})

const songsByAlbum = computed(() => {
  const map = new Map<number, ArtistInfo['songs']>()
  for (const song of props.artistInfo.songs) {
    if (!map.has(song.albumId)) {
      map.set(song.albumId, [])
    }
    map.get(song.albumId)!.push(song)
  }
  return map
})

const filteredSongsByAlbum = computed(() => {
  let songs = props.artistInfo.songs
  if (props.selectedRole)
    songs = songs.filter(s => s.roles.includes(props.selectedRole!))
  if (props.selectedProduct)
    songs = songs.filter(s => s.productName === props.selectedProduct)
  const map = new Map<number, ArtistInfo['songs']>()
  for (const song of songs) {
    if (!map.has(song.albumId)) {
      map.set(song.albumId, [])
    }
    map.get(song.albumId)!.push(song)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.albumIndex - b.albumIndex)
  }
  return map
})

const filteredAlbumsList = computed(() => {
  if (!props.selectedRole && !props.selectedProduct)
    return sortedAlbumsList.value
  return sortedAlbumsList.value.filter(album => filteredSongsByAlbum.value.has(album.id))
})

// 当前筛选条件下实际渲染的歌曲 id
const visibleSongIds = computed(() =>
  filteredAlbumsList.value.flatMap(album => filteredSongsByAlbum.value.get(album.id)?.map(s => s.id) ?? []),
)

registerSongList({ songIds: visibleSongIds })

function getAlbumRoles(albumId: number): string[] {
  const songs = songsByAlbum.value.get(albumId)
  if (!songs)
    return []
  const roles = new Set<string>()
  for (const song of songs) {
    for (const role of song.roles) {
      roles.add(role)
    }
  }
  return [...roles]
}

async function playArtistSongsFromAlbum(albumId: number) {
  try {
    const album = await getAlbumInfoApi(albumId)
    const artistSongIds = new Set(
      filteredSongsByAlbum.value.get(albumId)?.map(s => s.id) ?? [],
    )
    const filteredSongs = album.songs.filter(s => artistSongIds.has(s.id))
    if (filteredSongs.length === 0) {
      toast.error(t('ArtistAlbumList.no_matching_songs_in_this_album'))
      return
    }
    const playlist = filteredSongs.map(song => buildPlaylistItem(song, album))
    player.replacePlaylist(playlist, 0)
    toast.success(t('AlbumList.queue_replaced'))
  }
  catch (error) {
    toast.error(t('AlbumList.failed_to_get_album_details', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
  }
}

function playSong(event: Event, songId: number, albumId: number) {
  event.preventDefault()
  event.stopPropagation()
  const visibleAlbums = filteredAlbumsList.value.map(album => ({
    albumId: album.id,
    songIds: filteredSongsByAlbum.value.get(album.id)?.map(song => song.id) ?? [],
  }))

  playbackDialog.value?.play({
    songId,
    get loadingMessage() {
      return t('ArtistAlbumList.preparing_songs')
    },
    loadSong: async () => {
      const album = await loadAlbum(albumId)
      const song = album.songs.find(item => item.id === songId)
      if (!song)
        throw new LocalizedError('ArtistAlbumList.song_details_not_found')
      return buildPlaylistItem(song, album)
    },
    loadSongs: async () => {
      const playlist: PlaylistSongItem[] = []
      for (let start = 0; start < visibleAlbums.length; start += 4) {
        const batch = visibleAlbums.slice(start, start + 4)
        const albums = await Promise.all(batch.map(item => loadAlbum(item.albumId)))
        for (const [index, album] of albums.entries()) {
          const songsById = new Map(album.songs.map(song => [song.id, song]))
          for (const id of batch[index].songIds) {
            const song = songsById.get(id)
            if (!song)
              throw new LocalizedError('ArtistAlbumList.song_details_not_found')
            playlist.push(buildPlaylistItem(song, album))
          }
        }
      }
      return playlist
    },
  })
}
</script>

<template>
  <div class="flex flex-col">
    <div v-for="album in filteredAlbumsList" :key="album.id" class="mb-4 bg-black/5 dark:bg-white/5 rounded-xl p-4">
      <RouterLink :to="{ name: 'AlbumInfo', params: { id: album.id } }" :title="album.name">
        <div class="group flex items-center gap-2 md:gap-3 rounded-xl">
          <div class="shrink-0 size-14 md:size-20 rounded-lg overflow-hidden">
            <CoverImage :src="getCoverUrl(album.platforms, '128px')" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm md:text-base font-medium truncate">
              {{ album.name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              {{ getPublishDate(album.publishDate) }} · {{ formatNumber(filteredSongsByAlbum.get(album.id)?.length) }} / {{ formatNumber(album.songCount) }}
            </div>
            <div v-if="getAlbumRoles(album.id).length" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="role in getAlbumRoles(album.id)" :key="role"
                class="text-xs bg-black/8 dark:bg-white/8 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded"
              >
                {{ role }}
              </span>
            </div>
          </div>
          <AppButton
            icon-only
            size="xs"
            variant="ghost"
            class="shrink-0 text-gray-400 hover:text-gray-500 hover:dark:text-gray-400 transition-all hover:scale-105 active:scale-95"
            :aria-label="t('ArtistAlbumList.play_songs_featuring_this_artist')"
            :title="t('ArtistAlbumList.play_songs_featuring_this_artist')"
            @click.prevent="playArtistSongsFromAlbum(album.id)"
          >
            <LucidePlay class="size-6" fill="currentColor" />
          </AppButton>
        </div>
      </RouterLink>
      <div v-if="filteredSongsByAlbum.get(album.id)?.length" class="md:ml-22 mt-2">
        <RouterLink
          v-for="song in filteredSongsByAlbum.get(album.id)" :key="song.id"
          :data-song-id="song.id"
          :to="{ name: 'MusicInfo', params: { albumId: song.albumId, musicId: song.id } }"
          class="group/song flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-500/10 transition-colors"
        >
          <div class="flex-1 min-w-0 flex items-center gap-2">
            <span class="text-xs text-gray-400 shrink-0 w-4">{{ song.albumIndex }}</span>
            <span class="text-sm truncate min-w-0">{{ song.name }}</span>
            <span class="text-xs text-gray-400 shrink-0 ml-auto">{{ song.roles.join(' / ') }}</span>
          </div>
          <FavoriteButton type="song" :song-id="song.id" />
          <AppButton
            icon-only
            size="xs"
            variant="ghost"
            class="hidden md:inline-flex shrink-0 text-gray-400 hover:text-gray-500 hover:dark:text-gray-400 opacity-0 md:group-hover/song:opacity-100 transition-all hover:scale-105 active:scale-95"
            :aria-label="t('ArtistAlbumList.play_song')"
            :title="t('ArtistAlbumList.play_song')"
            @click="playSong($event, song.id, song.albumId)"
          >
            <LucidePlay class="size-4" fill="currentColor" />
          </AppButton>
        </RouterLink>
      </div>
    </div>
    <SongListPlaybackDialog ref="playbackDialog" />
  </div>
</template>

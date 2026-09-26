<script setup lang="ts">
import type { PlaylistSongItem } from '@/types/core'
import type { SongListGroup } from '@/types/song-list'
import { toast } from 'vue-sonner'
import draggable from 'vuedraggable'
import SongListPlaybackDialog from '@/components/SongListPlaybackDialog.vue'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

type DisplayRow
  = | { type: 'group', key: string, label: string }
    | { type: 'song', key: string, song: PlaylistSongItem, displayIndex: number, absoluteIndex: number }

const props = withDefaults(defineProps<{
  songs?: PlaylistSongItem[]
  groups?: SongListGroup[]
  showCover?: boolean
  showAlbum?: boolean
  ranked?: boolean
  emptyText?: string
  playlistId?: string
  selectable?: boolean
  selectedIds?: Set<number>
  reorderable?: boolean
  busy?: boolean
}>(), {
  songs: () => [],
  groups: () => [],
  emptyText: '暂无歌曲',
  selectedIds: () => new Set<number>(),
})

const emit = defineEmits<{
  'update:songs': [songs: PlaylistSongItem[]]
  'update:selectedIds': [ids: Set<number>]
  'reorderStart': []
  'reorderEnd': []
}>()

const slots = defineSlots<{
  'row-actions': (props: { song: PlaylistSongItem }) => any
  'empty': () => any
}>()
const router = useRouter()
const store = useMainStore()
const player = usePlayerStore()
const isDragging = ref(false)
const playbackDialog = useTemplateRef<InstanceType<typeof SongListPlaybackDialog>>('playbackDialog')

const displayRows = computed<DisplayRow[]>({
  get: () => {
    if (props.groups.length) {
      let absoluteIndex = 0
      return props.groups.flatMap(group => [
        { type: 'group' as const, key: `group-${group.key}`, label: group.label },
        ...group.songs.map((song, index) => ({
          type: 'song' as const,
          key: `song-${group.key}-${song.songId}`,
          song,
          displayIndex: index + 1,
          absoluteIndex: absoluteIndex++,
        })),
      ])
    }

    return props.songs.map((song, index) => ({
      type: 'song' as const,
      key: `song-${song.songId}`,
      song,
      displayIndex: index + 1,
      absoluteIndex: index,
    }))
  },
  set: rows => emit('update:songs', rows.flatMap(row => row.type === 'song' ? [row.song] : [])),
})

const songCount = computed(() => props.groups.length
  ? props.groups.reduce((count, group) => count + group.songs.length, 0)
  : props.songs.length,
)

const allSelected = computed(() =>
  songCount.value > 0
  && displayRows.value.every(row => row.type === 'group' || props.selectedIds.has(row.song.songId)),
)

const columnCount = computed(() =>
  4 + Number(props.selectable) + Number(props.showCover) + Number(props.showAlbum),
)

const hasExtraActions = computed(() => props.reorderable || Boolean(slots['row-actions']))

function toggleSelect(songId: number) {
  const next = new Set(props.selectedIds)
  if (next.has(songId))
    next.delete(songId)
  else
    next.add(songId)
  emit('update:selectedIds', next)
}

function toggleSelectAll() {
  if (allSelected.value) {
    emit('update:selectedIds', new Set())
    return
  }

  emit('update:selectedIds', new Set(
    displayRows.value.flatMap(row => row.type === 'song' ? [row.song.songId] : []),
  ))
}

function openSong(song: PlaylistSongItem) {
  if (props.playlistId) {
    router.push({
      name: 'PlaylistMusicInfo',
      params: { playlistId: props.playlistId, musicId: song.songId },
    })
    return
  }

  router.push({
    name: 'MusicInfo',
    params: { albumId: song.albumId, musicId: song.songId },
  })
}

function playSong(song: PlaylistSongItem) {
  const songs = displayRows.value.flatMap(row => row.type === 'song' ? [row.song] : [])
  playbackDialog.value?.play({
    songId: song.songId,
    loadSong: async () => song,
    loadSongs: async () => songs,
  })
}

function addSongToPlaylist(song: PlaylistSongItem) {
  const { isNew } = player.addToPlaylist(song)
  toast.success(isNew ? '已添加至播放列表' : '歌曲已在播放列表中')
}

function handleDragStart() {
  isDragging.value = true
  emit('reorderStart')
}

function handleDragEnd() {
  isDragging.value = false
  emit('reorderEnd')
}
</script>

<template>
  <div class="bg-black/5 rounded-xl pt-2 pb-4 overflow-hidden">
    <table v-if="songCount" class="w-full table-fixed">
      <thead>
        <tr class="text-left">
          <th v-if="selectable" class="pl-3 p-2 w-[40px]">
            <input
              type="checkbox"
              class="cursor-pointer"
              :checked="allSelected"
              aria-label="选择全部歌曲"
              @change="toggleSelectAll"
            >
          </th>
          <th class="p-2 text-center" :class="ranked ? 'w-[56px]' : 'w-[48px]'">
            #
          </th>
          <th v-if="showCover" class="hidden sm:table-cell p-2 w-[56px]" />
          <th class="p-2">
            歌曲
          </th>
          <th v-if="showAlbum" class="hidden md:table-cell p-2 w-[200px]">
            专辑
          </th>
          <th class="p-2 w-[100px]">
            时长
          </th>
          <th
            class="hidden md:table-cell p-2"
            :class="hasExtraActions ? 'w-[160px]' : 'w-[120px]'"
          />
        </tr>
      </thead>
      <draggable
        v-model="displayRows"
        tag="tbody"
        item-key="key"
        handle=".song-list-drag-handle"
        :disabled="!reorderable || busy"
        :animation="200"
        @start="handleDragStart"
        @end="handleDragEnd"
      >
        <template #item="{ element: row }">
          <tr v-if="row.type === 'group'">
            <td :colspan="columnCount">
              <div class="text-gray-600 py-2 px-3 text-sm">
                {{ row.label }}
              </div>
            </td>
          </tr>
          <tr
            v-else
            :data-song-id="row.song.songId"
            class="cursor-pointer transition-colors group"
            :class="{
              'bg-blue-50/60': selectedIds.has(row.song.songId),
              'hover:bg-black/8': !isDragging,
            }"
            @click="openSong(row.song)"
          >
            <td v-if="selectable" class="pl-3 p-2" @click.stop>
              <input
                type="checkbox"
                class="cursor-pointer"
                :checked="selectedIds.has(row.song.songId)"
                :aria-label="`选择歌曲 ${row.song.songName}`"
                @change="toggleSelect(row.song.songId)"
              >
            </td>
            <td class="p-2 text-center text-gray-500 text-sm">
              <span
                v-if="player.isPlaying && player.currentSong?.songId === row.song.songId"
                class="song-list-playing inline-flex h-6 w-6 items-center justify-center gap-[2px] align-middle text-blue-500"
                role="img"
                :aria-label="`正在播放：${row.song.songName}`"
              >
                <span v-for="bar in 3" :key="bar" class="song-list-playing-bar" aria-hidden="true" />
              </span>
              <span
                v-else-if="ranked"
                class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                :class="row.absoluteIndex < 3
                  ? ['text-white', row.absoluteIndex === 0 ? 'bg-amber-400' : row.absoluteIndex === 1 ? 'bg-gray-400' : 'bg-orange-400']
                  : ''"
              >
                {{ row.displayIndex }}
              </span>
              <template v-else>
                {{ row.displayIndex }}
              </template>
            </td>
            <td v-if="showCover" class="hidden sm:table-cell align-middle p-2">
              <div class="size-10 overflow-hidden rounded-md">
                <CoverImage :src="getCoverUrl(row.song.albumPlatforms, '96px')" />
              </div>
            </td>
            <td class="p-2 min-w-0">
              <p class="truncate text-sm font-medium" :title="row.song.songName">
                {{ row.song.songName }}
              </p>
              <p v-if="row.song.songDescription" class="truncate text-xs text-gray-500">
                {{ row.song.songDescription }}
              </p>
            </td>
            <td v-if="showAlbum" class="hidden md:table-cell p-2 text-sm text-gray-500 truncate" :title="row.song.albumName">
              <RouterLink
                :to="{ name: 'AlbumInfo', params: { id: row.song.albumId } }"
                class="hover:text-blue-500 transition-colors"
                @click.stop
              >
                {{ row.song.albumName }}
              </RouterLink>
            </td>
            <td class="p-2 text-sm text-gray-500">
              {{ formatDuration(row.song.duration) }}
            </td>
            <td class="hidden md:table-cell p-2" @click.stop>
              <div class="flex gap-1">
                <div
                  v-if="!store.favoriteSongIds.includes(row.song.songId)"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FavoriteButton type="song" :song-id="row.song.songId" />
                </div>
                <FavoriteButton
                  v-else
                  type="song"
                  :song-id="row.song.songId"
                />
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AppButton
                    icon-only
                    size="xs"
                    variant="ghost"
                    title="播放"
                    @click="playSong(row.song)"
                  >
                    <LucidePlay class="size-4" />
                  </AppButton>
                  <AppButton
                    icon-only
                    size="xs"
                    variant="ghost"
                    title="加入播放列表"
                    @click="addSongToPlaylist(row.song)"
                  >
                    <LucidePlus class="size-4" />
                  </AppButton>
                  <slot name="row-actions" :song="row.song" />
                  <div
                    v-if="reorderable"
                    class="song-list-drag-handle p-1 rounded cursor-grab active:cursor-grabbing"
                    :class="{ 'pointer-events-none opacity-40': busy }"
                    title="拖拽排序"
                  >
                    <LucideGripVertical class="size-4" />
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </draggable>
    </table>

    <div v-else class="text-center py-10 text-sm text-gray-400">
      <slot name="empty">
        {{ emptyText }}
      </slot>
    </div>
    <SongListPlaybackDialog ref="playbackDialog" />
  </div>
</template>

<style scoped>
.song-list-playing-bar {
  width: 2px;
  height: 14px;
  border-radius: 1px;
  background: currentColor;
  transform-origin: bottom;
  animation: song-list-wave 0.8s ease-in-out infinite alternate;
}

.song-list-playing-bar:nth-child(2) {
  animation-delay: -0.35s;
}

.song-list-playing-bar:nth-child(3) {
  animation-delay: -0.6s;
}

@keyframes song-list-wave {
  from { transform: scaleY(0.3); }
  to { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
  .song-list-playing-bar {
    animation: none;
  }

  .song-list-playing-bar:nth-child(2) { transform: scaleY(0.6); }
  .song-list-playing-bar:nth-child(3) { transform: scaleY(0.8); }
}
</style>

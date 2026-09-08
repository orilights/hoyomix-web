<script setup lang="ts">
import type { PlaylistSongItem } from '@/types/core'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import draggable from 'vuedraggable'
import { cancelPlaylistReviewApi, deletePlaylistApi, getPlaylistReviewApi, NotFoundError, updatePlaylistSongsApi } from '@/api/music'
import { usePlaylistDetailQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl, getPublishDate } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()
const { albumList } = storeToRefs(store)
const { isLoggedIn, user } = storeToRefs(auth)
const queryClient = useQueryClient()

const playlistId = computed(() => route.params.id as string)
const { data: playlist, isLoading, isError, error, refetch } = usePlaylistDetailQuery(playlistId)

const dragging = ref(false)

watch(isError, (v) => {
  if (!v)
    return
  if (error.value instanceof NotFoundError)
    router.replace({ path: '/404', query: { errorMessage: error.value?.message } })
  else
    toast.error(`歌单加载失败：${error.value?.message ?? '未知错误'}`)
})

const isOwner = computed(() =>
  isLoggedIn.value && !!user.value && !!playlist.value && playlist.value.userId === user.value.id,
)

const reviewStatus = computed(() => playlist.value?.reviewStatus)

const { data: reviewDetail } = useQuery({
  queryKey: computed(() => ['playlistReview', playlistId.value]),
  queryFn: () => getPlaylistReviewApi(playlistId.value),
  enabled: computed(() => isOwner.value && reviewStatus.value === 'rejected'),
  staleTime: 1000 * 60 * 5,
})

const coverAlbum = computed(() =>
  playlist.value?.coverAlbumId
    ? albumList.value.find(a => a.id === playlist.value!.coverAlbumId)
    : null,
)

const coverUrl = computed(() =>
  coverAlbum.value ? getCoverUrl(coverAlbum.value.platforms, '512px') : '',
)

const coverThumbUrl = computed(() =>
  coverAlbum.value ? getCoverUrl(coverAlbum.value.platforms, '128px') : '',
)

const savingOrder = ref(false)

const isFavoritesPlaylist = computed(() => playlist.value?.type === 'favorites')
const canEdit = computed(() => isOwner.value)
const canManagePlaylist = computed(() => isOwner.value && !isFavoritesPlaylist.value)

usePageSeo({
  title: computed(() => playlist.value?.name ?? null),
  description: computed(() => playlist.value?.description || null),
  path: computed(() => (playlistId.value ? `/playlist/${playlistId.value}` : null)),
  image: coverUrl,
})

watch(playlist, (val) => {
  if (val) {
    store.setBackground(coverThumbUrl.value || undefined)
  }
}, { immediate: true })

// 收藏歌单所有者收藏操作后刷新列表
watch(store.favoriteSongIds, () => {
  if (isFavoritesPlaylist.value && isOwner.value)
    refetch()
}, { deep: false })

const localSongs = ref<PlaylistSongItem[]>([])

watch(playlist, (val) => {
  if (val)
    localSongs.value = [...val.songs]
}, { immediate: true })

function playAll() {
  if (!localSongs.value.length)
    return
  player.replacePlaylist(localSongs.value, 0)
  toast.success('已替换播放列表')
}

function addAllToPlaylist() {
  let addCount = 0
  for (const song of localSongs.value) {
    const { isNew } = player.addToPlaylist(song)
    if (isNew)
      addCount++
  }
  toast.success(addCount > 0 ? `已添加 ${addCount} 首至播放列表` : '所有歌曲已在播放列表中')
}

function playSong(song: PlaylistSongItem) {
  const { index } = player.addToPlaylist(song)
  player.playSong(index)
  toast.success('已添加至播放列表并播放')
}

function addSongToPlaylist(song: PlaylistSongItem) {
  const { isNew } = player.addToPlaylist(song)
  toast.success(isNew ? '已添加至播放列表' : '歌曲已在播放列表中')
}

const showMultiSelect = ref(false)
const selectedIds = ref<Set<number>>(new Set())

function toggleMultiSelect() {
  showMultiSelect.value = !showMultiSelect.value
  if (!showMultiSelect.value)
    selectedIds.value = new Set()
}

const allSelected = computed(() =>
  localSongs.value.length > 0 && localSongs.value.every(s => selectedIds.value.has(s.songId)),
)

function toggleSelect(songId: number) {
  if (selectedIds.value.has(songId))
    selectedIds.value.delete(songId)
  else
    selectedIds.value.add(songId)
}

function toggleSelectAll() {
  if (allSelected.value)
    selectedIds.value = new Set()
  else
    selectedIds.value = new Set(localSongs.value.map(s => s.songId))
}

const selectedSongs = computed(() =>
  localSongs.value.filter(s => selectedIds.value.has(s.songId)),
)

function playSelected() {
  if (!selectedSongs.value.length)
    return
  player.replacePlaylist(selectedSongs.value, 0)
  toast.success('已替换播放列表')
  selectedIds.value = new Set()
}

function addSelectedToPlaylist() {
  let addCount = 0
  for (const song of selectedSongs.value) {
    const { isNew } = player.addToPlaylist(song)
    if (isNew)
      addCount++
  }
  toast.success(addCount > 0 ? `已添加 ${addCount} 首至播放列表` : '所有歌曲已在播放列表中')
  selectedIds.value = new Set()
}

async function removeSong(song: PlaylistSongItem) {
  if (!isOwner.value || !playlist.value)
    return
  const newIds = localSongs.value.filter(s => s.songId !== song.songId).map(s => s.songId)
  savingOrder.value = true
  try {
    await updatePlaylistSongsApi(playlist.value.id, newIds)
    localSongs.value = localSongs.value.filter(s => s.songId !== song.songId)
    queryClient.invalidateQueries({ queryKey: ['playlistDetail', playlist.value.id] })
    toast.success('已从歌单移除')
  }
  catch (error) {
    toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    savingOrder.value = false
  }
}

async function removeSelected() {
  if (!isOwner.value || !playlist.value || !selectedIds.value.size)
    return
  const newIds = localSongs.value
    .filter(s => !selectedIds.value.has(s.songId))
    .map(s => s.songId)
  savingOrder.value = true
  try {
    await updatePlaylistSongsApi(playlist.value.id, newIds)
    localSongs.value = localSongs.value.filter(s => !selectedIds.value.has(s.songId))
    queryClient.invalidateQueries({ queryKey: ['playlistDetail', playlist.value.id] })
    selectedIds.value = new Set()
    toast.success('已删除选中歌曲')
  }
  catch (error) {
    toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    savingOrder.value = false
  }
}

const showEditDialog = ref(false)

function onDragStart() {
  dragging.value = true
}

async function onDragEnd() {
  dragging.value = false
  if (!playlist.value)
    return
  savingOrder.value = true
  try {
    await updatePlaylistSongsApi(playlist.value.id, localSongs.value.map(s => s.songId))
    queryClient.invalidateQueries({ queryKey: ['playlistDetail', playlist.value.id] })
  }
  catch (error) {
    toast.error(`保存顺序失败：${error instanceof Error ? error.message : '未知错误'}`)
    refetch()
  }
  finally {
    savingOrder.value = false
  }
}

function openEdit() {
  if (!auth.requireLogin())
    return
  if (isFavoritesPlaylist.value) {
    toast.error('收藏歌单不支持编辑')
    return
  }
  showEditDialog.value = true
}

function onEditSuccess() {
  refetch()
  queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
  queryClient.invalidateQueries({ queryKey: ['playlists'] })
}

const cancellingReview = ref(false)

async function cancelReview() {
  if (!playlist.value)
    return
  cancellingReview.value = true
  try {
    await cancelPlaylistReviewApi(playlist.value.id)
    await refetch()
    queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
    toast.success('已取消审核申请')
  }
  catch (error) {
    toast.error(`取消失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    cancellingReview.value = false
  }
}

async function deletePlaylist() {
  if (!playlist.value || isFavoritesPlaylist.value)
    return
  try {
    await deletePlaylistApi(playlist.value.id)
    queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
    queryClient.invalidateQueries({ queryKey: ['playlists'] })
    toast.success('歌单已删除')
    router.push({ name: 'Playlists' })
  }
  catch (error) {
    toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
}

onMounted(() => {
  document.documentElement.scrollTo(0, 0)
})
</script>

<template>
  <AsyncFade>
    <div v-if="isLoading" class="flex items-center justify-center py-20 text-gray-400">
      <LucideLoader2 class="size-6 animate-spin mr-2" />
      加载中...
    </div>

    <div v-else-if="isError" class="flex items-center justify-center py-20 text-red-400">
      加载失败，请刷新重试
    </div>

    <div v-else-if="playlist">
      <div class="flex md:h-[200px] lg:h-[300px]">
        <div class="size-[100px] md:size-[200px] lg:size-[300px] rounded-2xl shrink-0 shadow-md overflow-hidden">
          <div v-if="coverUrl" class="size-full">
            <CoverImage :src="coverUrl" />
          </div>
          <div v-else class="size-full bg-gray-200 flex items-center justify-center">
            <LucideMusic class="size-12 text-blue-400" />
          </div>
        </div>

        <div class="flex flex-col ml-4 md:ml-8 overflow-hidden">
          <div class="md:text-xl lg:text-3xl font-bold truncate" :title="playlist.name">
            {{ playlist.name }}
          </div>

          <div class="mt-1 md:mt-2 flex items-center gap-x-2 flex-wrap text-sm md:text-base">
            <span class="text-gray-500 hidden md:inline">创建人</span>
            <span class="w-[200px] truncate" :title="playlist.userId">
              {{ playlist.userId }}
            </span>
            <span class="text-gray-500 hidden md:inline">创建于</span>
            <span>
              {{ getPublishDate(playlist.createdAt) }}
            </span>
            <span class="text-gray-500 hidden md:inline">歌曲数量</span>
            <span>
              {{ playlist.songCount }}
            </span>
          </div>

          <div
            v-if="isOwner && reviewStatus && reviewStatus !== 'none'"
            class="mt-1 md:mt-2 flex items-center gap-2 flex-wrap shrink-0"
          >
            <span
              v-if="reviewStatus === 'pending'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"
            >
              <LucideClock class="size-3" />
              审核中
            </span>
            <span
              v-else-if="reviewStatus === 'rejected'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"
            >
              <LucideCircleX class="size-3" />
              审核已驳回
            </span>
            <span
              v-else-if="reviewStatus === 'approved'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"
            >
              <LucideCircleCheck class="size-3" />
              审核已通过
            </span>
            <span
              v-if="reviewStatus === 'rejected' && reviewDetail?.reason"
              class="text-xs text-gray-500"
            >
              原因：{{ reviewDetail.reason }}
            </span>
            <button
              v-if="reviewStatus === 'pending'"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              :disabled="cancellingReview"
              @click="cancelReview"
            >
              {{ cancellingReview ? '取消中...' : '撤销申请' }}
            </button>
          </div>

          <OverlayScrollbarsComponent
            class="mt-1 md:mt-2 flex-1 text-xs md:text-sm lg:text-base"
            :options="{ scrollbars: { theme: 'os-theme-custom', autoHide: 'leave', clickScroll: true } }"
            defer
          >
            {{ playlist.description }}
          </OverlayScrollbarsComponent>

          <div class="hidden md:flex gap-2 pt-2 mt-auto flex-wrap shrink-0">
            <PlaylistActions
              :is-owner="canManagePlaylist"
              :multi-select-active="showMultiSelect"
              :playlist-id="playlist.id"
              :show-favorite="!isFavoritesPlaylist"
              @play-all="playAll"
              @add-all="addAllToPlaylist"
              @toggle-multi-select="toggleMultiSelect"
              @edit="openEdit"
              @delete="deletePlaylist"
            />
          </div>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap md:hidden mt-4">
        <PlaylistActions
          :is-owner="canManagePlaylist"
          :multi-select-active="showMultiSelect"
          :playlist-id="playlist.id"
          :show-favorite="!isFavoritesPlaylist"
          @play-all="playAll"
          @add-all="addAllToPlaylist"
          @toggle-multi-select="toggleMultiSelect"
          @edit="openEdit"
          @delete="deletePlaylist"
        />
      </div>

      <div class="mt-4 bg-black/5 rounded-xl pt-2 pb-4">
        <table class="w-full table-fixed overflow-hidden">
          <thead>
            <tr class="text-left">
              <th v-if="showMultiSelect" class="pl-3 p-2 w-[40px]">
                <input
                  type="checkbox"
                  class="cursor-pointer"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                >
              </th>
              <th class="pl-4 p-2 w-[40px]">
                #
              </th>
              <th class="p-2">
                歌曲
              </th>
              <th class="p-2 w-[100px]">
                时长
              </th>
              <th class="p-2 w-[160px] hidden md:table-cell" />
            </tr>
          </thead>
          <draggable
            v-model="localSongs"
            tag="tbody"
            item-key="songId"
            handle=".drag-handle"
            :animation="200"
            @start="onDragStart"
            @end="onDragEnd"
          >
            <template #item="{ element: song, index }">
              <tr
                class="transition-colors group"
                :class="{
                  'bg-blue-50/60': selectedIds.has(song.songId),
                  'hover:bg-black/8': !dragging,
                }"
              >
                <td v-if="showMultiSelect" class="pl-3 p-2">
                  <input
                    type="checkbox"
                    class="cursor-pointer"
                    :checked="selectedIds.has(song.songId)"
                    @change="toggleSelect(song.songId)"
                  >
                </td>
                <td class="pl-4 text-gray-500 text-sm">
                  {{ index + 1 }}
                </td>
                <td class="p-2 cursor-pointer" @click="$router.push({ name: 'PlaylistMusicInfo', params: { playlistId, musicId: song.songId } })">
                  <p class="truncate text-sm font-medium" :title="song.songName">
                    {{ song.songName }}
                  </p>
                  <p class="truncate text-xs text-gray-500">
                    {{ song.songDescription }}
                  </p>
                </td>
                <td class="p-2 text-sm text-gray-500">
                  {{ formatDuration(song.duration) }}
                </td>
                <td class="hidden md:table-cell p-2">
                  <div class="flex gap-1">
                    <div
                      v-if="!store.favoriteSongIds.includes(song.songId)"
                      class="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FavoriteButton type="song" :song-id="song.songId" />
                    </div>
                    <FavoriteButton
                      v-else
                      type="song"
                      :song-id="song.songId"
                    />
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AppButton
                        icon-only
                        size="xs"
                        variant="ghost"
                        title="播放"
                        @click="playSong(song)"
                      >
                        <LucidePlay class="size-4" />
                      </AppButton>
                      <AppButton
                        icon-only
                        size="xs"
                        variant="ghost"
                        title="加入播放列表"
                        @click="addSongToPlaylist(song)"
                      >
                        <LucidePlus class="size-4" />
                      </AppButton>
                      <template v-if="canEdit">
                        <AppButton
                          icon-only
                          size="xs"
                          variant="ghost"
                          title="从歌单移除"
                          :disabled="savingOrder"
                          @click="removeSong(song)"
                        >
                          <LucideTrash2 class="size-4" />
                        </AppButton>
                        <div class="drag-handle p-1 rounded cursor-grab active:cursor-grabbing">
                          <LucideGripVertical class="size-4" />
                        </div>
                      </template>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </draggable>
        </table>

        <div v-if="localSongs.length === 0" class="text-center py-10 text-sm text-gray-400">
          歌单暂无歌曲
        </div>
      </div>

      <Teleport to="body">
        <Transition name="action-bar">
          <div
            v-if="selectedIds.size > 0"
            class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 text-nowrap"
          >
            <span class="text-sm text-white/70">已选 {{ selectedIds.size }} 首</span>
            <div class="w-px h-4 bg-white/20" />
            <button
              class="flex items-center gap-1.5 text-sm hover:text-blue-400 transition-colors cursor-pointer"
              @click="playSelected"
            >
              <LucidePlay class="size-4" />
              播放
            </button>
            <button
              class="flex items-center gap-1.5 text-sm hover:text-blue-400 transition-colors cursor-pointer"
              @click="addSelectedToPlaylist"
            >
              <LucidePlus class="size-4" />
              加入播放列表
            </button>
            <template v-if="canEdit">
              <div class="w-px h-4 bg-white/20" />
              <button
                class="flex items-center gap-1.5 text-sm hover:text-red-400 transition-colors cursor-pointer"
                :disabled="savingOrder"
                @click="removeSelected"
              >
                <LucideTrash2 class="size-4" />
                删除
              </button>
            </template>
            <button
              class="text-white/40 hover:text-white cursor-pointer ml-1"
              @click="selectedIds = new Set()"
            >
              <LucideX class="size-4" />
            </button>
          </div>
        </Transition>
      </Teleport>

      <CreatePlaylistDialog
        v-if="playlist"
        v-model="showEditDialog"
        mode="edit"
        :existing-playlist="playlist"
        @success="onEditSuccess"
      />
    </div>
  </AsyncFade>
</template>

<style scoped>
.action-bar-enter-active,
.action-bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.action-bar-enter-from,
.action-bar-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>

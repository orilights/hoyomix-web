<script setup lang="ts">
import type { PlaylistSongItem } from '@/types/core'
import { useQueryClient } from '@tanstack/vue-query'
import { useMediaQuery } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { cancelPlaylistReviewApi, deletePlaylistApi, updatePlaylistSongsApi } from '@/api/music'
import { useCommentThreadsQuery, usePlaylistDetailQuery, usePlaylistReviewQuery, useSavePlaylistOrderQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { asyncFadeHeightKey } from '@/constants/async-fade'
import { vPageEnter } from '@/directives/page-enter'
import { formatNumber, t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl, getPublishDate } from '@/utils'
import { NotFoundError } from '@/utils/fetch'

provide(asyncFadeHeightKey, true)

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
const commentPostId = computed(() => playlist.value?.isPublic ? `hoyomix:playlist:${playlist.value.id}` : null)
const commentUserId = computed(() => user.value?.id ?? null)
const commentPage = ref(1)
const { data: commentThreads } = useCommentThreadsQuery(commentPostId, commentUserId, commentPage)
const commentCount = computed(() => commentThreads.value?.commentCount ?? commentThreads.value?.pagination.total ?? 0)
const commentSection = ref<HTMLElement | null>(null)

const activeTab = ref<'songs' | 'info' | 'comments'>('songs')
const descriptionExpanded = ref(false)
const tabOptions = computed(() => [
  { key: 'songs' as const, label: t('Album.tracks') },
  { key: 'info' as const, label: t('Playlist.playlist_information') },
  ...(playlist.value?.isPublic ? [{ key: 'comments' as const, label: t('AlbumActions.comments', { p0: commentCount.value }) }] : []),
])

async function scrollToComments() {
  activeTab.value = 'comments'
  await nextTick()
  commentSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch([commentPostId, () => route.query.commentPostId], ([postId, targetPostId]) => {
  if (postId && targetPostId === postId)
    activeTab.value = 'comments'
}, { immediate: true })

watch(playlistId, () => {
  activeTab.value = 'songs'
  descriptionExpanded.value = false
})

watch(isError, (v) => {
  if (!v)
    return
  if (error.value instanceof NotFoundError)
    router.replace({ path: '/404', query: { errorMessage: error.value?.message } })
  else
    toast.error(t('Playlist.failed_to_load_playlist', { p0: error.value?.message ?? t('App.unknown_error') }))
})

const isOwner = computed(() =>
  isLoggedIn.value && !!user.value && !!playlist.value && playlist.value.userId === user.value.id,
)

const reviewStatus = computed(() => playlist.value?.reviewStatus)

const { data: reviewDetail, isLoading: isReviewLoading, isError: isReviewError, refetch: refetchReview } = usePlaylistReviewQuery(
  playlistId,
  computed(() => isOwner.value && reviewStatus.value === 'rejected'),
)

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

const showMultiSelect = ref(false)
const selectedIds = ref<Set<number>>(new Set())
const localSongs = ref<PlaylistSongItem[]>([])
const totalDuration = computed(() => localSongs.value.reduce((total, song) => total + (Number(song.duration) || 0), 0))
const isMobile = useMediaQuery('(max-width: 767px)')
const hasCoarsePointer = useMediaQuery('(any-pointer: coarse)')
const needsSortingMode = computed(() => isMobile.value || hasCoarsePointer.value)
const sorting = ref(false)
const sortDragging = ref(false)
const draftSongs = ref<PlaylistSongItem[]>([])
const originalOrder = ref<number[]>([])
const { mutateAsync: savePlaylistOrder } = useSavePlaylistOrderQuery()
const orderChanged = computed(() => sorting.value
  && (draftSongs.value.length !== originalOrder.value.length
    || draftSongs.value.some((song, index) => song.songId !== originalOrder.value[index])),
)
const displayedSongs = computed({
  get: () => sorting.value ? draftSongs.value : localSongs.value,
  set: (songs: PlaylistSongItem[]) => {
    if (sorting.value)
      draftSongs.value = songs
    else
      localSongs.value = songs
  },
})
const showUnsavedOrderDialog = ref(false)
let resolveNavigation: ((leave: boolean) => void) | null = null

function startSorting() {
  if (!canEdit.value || savingOrder.value || localSongs.value.length < 2)
    return
  showMultiSelect.value = false
  selectedIds.value = new Set()
  activeTab.value = 'songs'
  draftSongs.value = [...localSongs.value]
  originalOrder.value = localSongs.value.map(song => song.songId)
  sorting.value = true
}

function cancelSorting() {
  if (savingOrder.value)
    return
  sorting.value = false
  draftSongs.value = []
  originalOrder.value = []
  sortDragging.value = false
}

function finishNavigation(leave: boolean) {
  const resolve = resolveNavigation
  resolveNavigation = null
  showUnsavedOrderDialog.value = false
  resolve?.(leave)
}

async function saveSorting() {
  if (!canEdit.value || !playlist.value || savingOrder.value || sortDragging.value || !orderChanged.value)
    return false
  const id = playlist.value.id
  const songs = [...draftSongs.value]
  savingOrder.value = true
  try {
    await savePlaylistOrder({ id, songIds: songs.map(song => song.songId) })
    // 同步详情缓存，避免退出排序模式时被旧顺序覆盖。
    queryClient.setQueryData(['playlistDetail', id], { ...playlist.value, songs })
    localSongs.value = songs
    sorting.value = false
    draftSongs.value = []
    originalOrder.value = []
    void queryClient.invalidateQueries({ queryKey: ['playlistDetail', id] })
    toast.success(t('Playlist.song_order_saved'))
    return true
  }
  catch (error) {
    toast.error(t('Playlist.failed_to_save_order', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
    return false
  }
  finally {
    savingOrder.value = false
  }
}

function confirmNavigation() {
  if (savingOrder.value || sortDragging.value)
    return false
  if (!orderChanged.value) {
    cancelSorting()
    return true
  }
  resolveNavigation?.(false)
  showUnsavedOrderDialog.value = true
  return new Promise<boolean>((resolve) => {
    resolveNavigation = resolve
  })
}

async function saveAndLeave() {
  if (await saveSorting())
    finishNavigation(true)
}

function discardAndLeave() {
  cancelSorting()
  finishNavigation(true)
}

onBeforeRouteLeave(confirmNavigation)
onBeforeRouteUpdate((to, from) => to.params.id !== from.params.id ? confirmNavigation() : true)
watch(showUnsavedOrderDialog, (visible) => {
  if (!visible)
    finishNavigation(false)
})
watch(canEdit, (editable) => {
  if (!editable) {
    cancelSorting()
    finishNavigation(false)
  }
})
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (orderChanged.value || savingOrder.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  finishNavigation(false)
})

watch(playlist, (val) => {
  if (val)
    localSongs.value = [...val.songs]
}, { immediate: true })

registerSongList({
  songIds: () => localSongs.value.map(s => s.songId),
  // 定位前确保歌曲 Tab 可见
  onBeforeLocate: () => {
    activeTab.value = 'songs'
  },
})

function playAll() {
  if (!localSongs.value.length)
    return
  player.replacePlaylist(localSongs.value, 0)
  toast.success(t('AlbumList.queue_replaced'))
}

function addAllToPlaylist() {
  let addCount = 0
  for (const song of localSongs.value) {
    const { isNew } = player.addToPlaylist(song)
    if (isNew)
      addCount++
  }
  toast.success(addCount > 0 ? t('Playlist.added_song_to_queue', { p0: addCount }, Number(addCount)) : t('Playlist.all_songs_are_already_in_the_queue'))
}

function toggleMultiSelect() {
  showMultiSelect.value = !showMultiSelect.value
  if (!showMultiSelect.value)
    selectedIds.value = new Set()
}

const selectedSongs = computed(() =>
  localSongs.value.filter(s => selectedIds.value.has(s.songId)),
)

function playSelected() {
  if (!selectedSongs.value.length)
    return
  player.replacePlaylist(selectedSongs.value, 0)
  toast.success(t('AlbumList.queue_replaced'))
  selectedIds.value = new Set()
}

function addSelectedToPlaylist() {
  let addCount = 0
  for (const song of selectedSongs.value) {
    const { isNew } = player.addToPlaylist(song)
    if (isNew)
      addCount++
  }
  toast.success(addCount > 0 ? t('Playlist.added_song_to_queue', { p0: addCount }, Number(addCount)) : t('Playlist.all_songs_are_already_in_the_queue'))
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
    toast.success(t('Playlist.removed_from_playlist'))
  }
  catch (error) {
    toast.error(t('Playlist.failed_to_delete', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
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
    toast.success(t('Playlist.selected_songs_deleted'))
  }
  catch (error) {
    toast.error(t('Playlist.failed_to_delete', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
  }
  finally {
    savingOrder.value = false
  }
}

const showEditDialog = ref(false)

async function onDragEnd() {
  sortDragging.value = false
  if (sorting.value)
    return
  if (!playlist.value)
    return
  savingOrder.value = true
  try {
    await updatePlaylistSongsApi(playlist.value.id, localSongs.value.map(s => s.songId))
    queryClient.invalidateQueries({ queryKey: ['playlistDetail', playlist.value.id] })
  }
  catch (error) {
    toast.error(t('Playlist.failed_to_save_order', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
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
    toast.error(t('Playlist.saved_playlists_cannot_be_edited'))
    return
  }
  showEditDialog.value = true
}

function onEditSuccess() {
  refetch()
}

const cancellingReview = ref(false)
const showDeleteConfirm = ref(false)
const deletingPlaylist = ref(false)

async function cancelReview() {
  if (!playlist.value)
    return
  cancellingReview.value = true
  try {
    await cancelPlaylistReviewApi(playlist.value.id)
    await refetch()
    queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
    toast.success(t('Playlist.review_request_cancelled'))
  }
  catch (error) {
    toast.error(t('Playlist.failed_to_cancel', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
  }
  finally {
    cancellingReview.value = false
  }
}

function requestDeletePlaylist() {
  if (!playlist.value || isFavoritesPlaylist.value)
    return
  showDeleteConfirm.value = true
}

async function deletePlaylist() {
  if (!playlist.value || isFavoritesPlaylist.value || deletingPlaylist.value)
    return
  deletingPlaylist.value = true
  try {
    await deletePlaylistApi(playlist.value.id)
    queryClient.invalidateQueries({ queryKey: ['favoritePlaylists'] })
    queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
    queryClient.invalidateQueries({ queryKey: ['playlists'] })
    showDeleteConfirm.value = false
    toast.success(t('Playlist.playlist_deleted'))
    router.push({ name: 'Playlists' })
  }
  catch (error) {
    toast.error(t('Playlist.failed_to_delete', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
  }
  finally {
    deletingPlaylist.value = false
  }
}
</script>

<template>
  <AsyncFade :animate-height="false">
    <PageLoading v-if="isLoading" />

    <div v-else-if="isError" class="flex items-center justify-center py-20 text-red-400">
      {{ t('ArtistListByType.unable_to_load_refresh_to_try_again') }}
    </div>

    <div v-else-if="playlist" class="playlist-page detail-page">
      <div v-page-enter="0" class="detail-header">
        <div class="detail-cover rounded-2xl shrink-0 shadow-md overflow-hidden">
          <CoverImage
            v-if="coverUrl"
            :src="getCoverUrl(coverAlbum?.platforms ?? {}, '256px')"
          />
          <div v-else class="size-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <LucideMusic class="size-12 text-blue-400" />
          </div>
        </div>
        <div class="min-w-0">
          <div class="detail-title font-bold break-words" :title="playlist.name">
            {{ playlist.name }}
          </div>
          <div class="detail-meta mt-1 flex items-center flex-wrap text-sm text-gray-500 dark:text-gray-400">
            <span class="inline-flex items-center gap-1 min-w-0" :aria-label="t('Playlist.created_by')">
              <LucideUserRound class="size-4 shrink-0" aria-hidden="true" />
              <span class="max-w-[140px] truncate" :title="playlist.username">{{ playlist.username }}</span>
            </span>
            <span class="inline-flex items-center gap-1" :aria-label="t('Playlist.created_on')">
              <LucideCalendarDays class="size-4 shrink-0" aria-hidden="true" />
              {{ getPublishDate(playlist.createdAt) }}
            </span>
            <span class="inline-flex items-center gap-1" :aria-label="t('Album.song_count')">
              <LucideMusic class="size-4 shrink-0" aria-hidden="true" />
              {{ formatNumber(playlist.songCount) }}
            </span>
            <span class="inline-flex items-center gap-1" :aria-label="t('Album.total_duration')">
              <LucideClock class="size-4 shrink-0" aria-hidden="true" />
              {{ formatDuration(totalDuration) }}
            </span>
          </div>
          <div
            v-if="isOwner && reviewStatus && reviewStatus !== 'none'"
            class="mt-1 md:mt-2 flex items-center gap-2 flex-wrap shrink-0"
          >
            <span
              v-if="reviewStatus === 'pending'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
            >
              <LucideClock class="size-3" />{{ t('MusicActions.pending_review') }}</span>
            <span
              v-else-if="reviewStatus === 'rejected'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400"
            >
              <LucideCircleX class="size-3" />{{ t('Playlist.review_rejected') }}</span>
            <span
              v-else-if="reviewStatus === 'approved'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400"
            >
              <LucideCircleCheck class="size-3" />{{ t('Playlist.review_approved') }}</span>
            <AsyncFade>
              <span v-if="reviewStatus === 'rejected' && isReviewLoading" class="text-xs text-gray-400" role="status">{{ t('App.loading') }}</span>
              <span v-else-if="reviewStatus === 'rejected' && isReviewError" class="text-xs text-gray-400" role="alert">{{ t('Playlist.failed_to_load_review_reason') }}<button type="button" class="ml-1 text-blue-500 cursor-pointer" @click="refetchReview()">{{ t('App.retry') }}</button>
              </span>
              <span v-else-if="reviewStatus === 'rejected' && reviewDetail?.reason" class="text-xs text-gray-500 dark:text-gray-400">{{ t('Playlist.reason', { p0: reviewDetail.reason }) }}
              </span>
            </AsyncFade>
            <button
              v-if="reviewStatus === 'pending'"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              :disabled="cancellingReview"
              @click="cancelReview"
            >
              {{ cancellingReview ? t('Playlist.cancelling') : t('Playlist.withdraw_request') }}
            </button>
          </div>
        </div>
        <div v-if="!sorting" class="detail-actions">
          <PlaylistActions
            :is-owner="canManagePlaylist"
            :can-sort="canEdit && needsSortingMode"
            :sort-disabled="savingOrder || localSongs.length < 2"
            :multi-select-active="showMultiSelect"
            :playlist-id="playlist.id"
            :show-favorite="!isFavoritesPlaylist"
            :show-comments="playlist.isPublic"
            :comment-count="commentCount"
            @sort="startSorting"
            @play-all="playAll"
            @add-all="addAllToPlaylist"
            @toggle-multi-select="toggleMultiSelect"
            @edit="openEdit"
            @delete="requestDeletePlaylist"
            @show-comments="scrollToComments"
          />
        </div>
      </div>

      <div v-if="!sorting" class="detail-tabs">
        <SegmentSwitch v-model="activeTab" :options="tabOptions" block :aria-label="t('Playlist.playlist_content')" />
      </div>
      <div v-if="sorting" class="mt-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300" role="status">
        {{ t('Playlist.drag_the_handles_on_the_right_to_reorder_songs') }}
      </div>

      <div class="detail-content" :class="{ 'detail-content-single': sorting }">
        <div v-show="sorting || activeTab === 'songs' || activeTab === 'comments'" class="detail-desktop-visible min-w-0">
          <div v-show="sorting || activeTab === 'songs'" v-page-enter="120" class="detail-desktop-visible" :class="{ 'pb-24': sorting }">
            <SongList
              v-model:songs="displayedSongs"
              v-model:selected-ids="selectedIds"
              :playlist-id="playlistId"
              :selectable="showMultiSelect && !sorting"
              :reorderable="canEdit && (!needsSortingMode || sorting)"
              :sorting="sorting"
              :busy="savingOrder"
              :empty-text="t('Playlist.this_playlist_has_no_songs')"
              @reorder-start="sortDragging = true"
              @reorder-end="onDragEnd"
            >
              <template v-if="canEdit && !sorting" #row-actions="{ song }">
                <AppButton
                  icon-only
                  size="xs"
                  variant="ghost"
                  :title="t('Playlist.remove_from_playlist')"
                  :disabled="savingOrder"
                  @click="removeSong(song)"
                >
                  <LucideTrash2 class="size-4" />
                </AppButton>
              </template>
            </SongList>
          </div>
          <div v-if="playlist.isPublic && !sorting" v-show="activeTab === 'comments'" ref="commentSection" v-page-enter="route.query.commentId ? false : 240" class="detail-comments detail-desktop-visible">
            <CommentSection :post-id="`hoyomix:playlist:${playlist.id}`" />
          </div>
        </div>
        <aside v-if="!sorting" v-show="activeTab === 'info'" v-page-enter="120" class="detail-sidebar detail-desktop-visible min-w-0 p-4 bg-black/5 dark:bg-white/5 rounded-xl">
          <div v-if="playlist.description" class="text-sm">
            <p
              id="playlist-description-content"
              class="whitespace-pre-wrap break-words"
              :class="{ 'detail-description-collapsed': !descriptionExpanded }"
            >
              {{ playlist.description }}
            </p>
            <button
              type="button"
              class="mt-2 text-blue-500 hover:text-blue-600 cursor-pointer"
              :aria-expanded="descriptionExpanded"
              aria-controls="playlist-description-content"
              @click="descriptionExpanded = !descriptionExpanded"
            >
              {{ descriptionExpanded ? t('Album.collapse_description') : t('Album.expand_description') }}
            </button>
          </div>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('Playlist.no_introduction') }}
          </p>
          <dl class="detail-facts mt-4 text-sm">
            <dt class="text-gray-500 dark:text-gray-400">
              {{ t('Playlist.updated_on') }}
            </dt>
            <dd>{{ getPublishDate(playlist.updatedAt) }}</dd>
            <dt class="text-gray-500 dark:text-gray-400">
              {{ t('Playlist.visibility') }}
            </dt>
            <dd>{{ playlist.isPublic ? t('Playlist.public') : t('Playlist.only_me') }}</dd>
          </dl>
        </aside>
      </div>

      <Teleport to="body">
        <div v-if="sorting" class="fixed bottom-20 left-4 right-4 md:left-auto md:w-96 z-40 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-[var(--theme-surface)]/95 backdrop-blur-xl shadow-xl p-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ orderChanged ? t('Playlist.order_not_saved') : t('Playlist.reorder') }}</span>
          <div class="flex gap-2 shrink-0">
            <AppButton variant="outline" :disabled="savingOrder || sortDragging" @click="cancelSorting">
              {{ t('AlbumPickerDialog.cancel') }}
            </AppButton>
            <AppButton variant="primary" :disabled="!orderChanged || savingOrder || sortDragging" @click="saveSorting">
              <LucideLoader2 v-if="savingOrder" class="size-4 animate-spin" />
              {{ savingOrder ? t('Playlist.saving') : t('Playlist.save_order') }}
            </AppButton>
          </div>
        </div>
        <Transition name="action-bar">
          <div
            v-if="selectedIds.size > 0"
            class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 whitespace-nowrap"
          >
            <span class="text-sm text-white/70">{{ t('Playlist.song_selected', { p0: selectedIds.size }, Number(selectedIds.size)) }}</span>
            <div class="w-px h-4 bg-white/20 dark:bg-[var(--theme-surface)]/20" />
            <button
              class="flex items-center gap-1.5 text-sm hover:text-blue-400 transition-colors cursor-pointer"
              @click="playSelected"
            >
              <LucidePlay class="size-4" />{{ t('MusicActions.play') }}
            </button>
            <button
              class="flex items-center gap-1.5 text-sm hover:text-blue-400 transition-colors cursor-pointer"
              @click="addSelectedToPlaylist"
            >
              <LucidePlus class="size-4" />{{ t('SongList.add_to_queue') }}
            </button>
            <template v-if="canEdit">
              <div class="w-px h-4 bg-white/20 dark:bg-[var(--theme-surface)]/20" />
              <button
                class="flex items-center gap-1.5 text-sm hover:text-red-400 transition-colors cursor-pointer"
                :disabled="savingOrder"
                @click="removeSelected"
              >
                <LucideTrash2 class="size-4" />{{ t('SongVideoEditDialog.delete') }}
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

      <AppDialog v-model="showUnsavedOrderDialog" :title="t('Playlist.unsaved_song_order')">
        <div class="px-6 py-5 text-sm text-gray-600 dark:text-gray-400">
          {{ t('Playlist.save_the_new_song_order_before_leaving') }}
        </div>
        <template #footer>
          <div class="px-4 py-3 flex flex-wrap justify-end gap-2">
            <AppButton variant="outline" :disabled="savingOrder" @click="finishNavigation(false)">
              {{ t('Playlist.keep_editing') }}
            </AppButton>
            <AppButton variant="danger" :disabled="savingOrder" @click="discardAndLeave">
              {{ t('Playlist.discard_changes') }}
            </AppButton>
            <AppButton variant="primary" :disabled="savingOrder" @click="saveAndLeave">
              <LucideLoader2 v-if="savingOrder" class="size-4 animate-spin" />
              {{ savingOrder ? t('Playlist.saving') : t('Playlist.save_and_leave') }}
            </AppButton>
          </div>
        </template>
      </AppDialog>

      <CreatePlaylistDialog
        v-if="playlist"
        v-model="showEditDialog"
        mode="edit"
        :existing-playlist="playlist"
        @success="onEditSuccess"
      />
      <AppDialog v-model="showDeleteConfirm" :title="t('Playlist.delete_playlist')">
        <div class="px-6 py-5 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ t('Playlist.delete_the_playlist', { p0: playlist?.name }) }}</p>
          <p class="mt-2 text-red-500">
            {{ t('Playlist.this_cannot_be_undone') }}
          </p>
        </div>
        <template #footer>
          <div class="px-6 py-3 flex justify-end gap-2">
            <AppButton variant="outline" :disabled="deletingPlaylist" @click="showDeleteConfirm = false">
              {{ t('AlbumPickerDialog.cancel') }}
            </AppButton>
            <AppButton variant="danger" :disabled="deletingPlaylist" @click="deletePlaylist">
              <LucideLoader2 v-if="deletingPlaylist" class="size-4 animate-spin" />
              {{ deletingPlaylist ? t('Playlist.deleting') : t('Playlist.confirm_deletion') }}
            </AppButton>
          </div>
        </template>
      </AppDialog>
    </div>
  </AsyncFade>
</template>

<style scoped>
.action-bar-enter-active,
.action-bar-leave-active {
  transition: opacity 0.2s ease, translate 0.2s ease;
}
.action-bar-enter-from,
.action-bar-leave-to {
  opacity: 0;
  translate: 0 12px;
}
</style>

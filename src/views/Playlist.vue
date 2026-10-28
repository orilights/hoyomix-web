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
  { key: 'songs' as const, label: '曲目' },
  { key: 'info' as const, label: '歌单信息' },
  ...(playlist.value?.isPublic ? [{ key: 'comments' as const, label: `评论 ${commentCount.value}` }] : []),
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
    toast.error(`歌单加载失败：${error.value?.message ?? '未知错误'}`)
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
    toast.success('已保存歌曲顺序')
    return true
  }
  catch (error) {
    toast.error(`保存顺序失败：${error instanceof Error ? error.message : '未知错误'}`)
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
    toast.success('已取消审核申请')
  }
  catch (error) {
    toast.error(`取消失败：${error instanceof Error ? error.message : '未知错误'}`)
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
    toast.success('歌单已删除')
    router.push({ name: 'Playlists' })
  }
  catch (error) {
    toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`)
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
      加载失败，请刷新重试
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
            <span class="inline-flex items-center gap-1 min-w-0" aria-label="创建人">
              <LucideUserRound class="size-4 shrink-0" aria-hidden="true" />
              <span class="max-w-[140px] truncate" :title="playlist.username">{{ playlist.username }}</span>
            </span>
            <span class="inline-flex items-center gap-1" aria-label="创建日期">
              <LucideCalendarDays class="size-4 shrink-0" aria-hidden="true" />
              {{ getPublishDate(playlist.createdAt) }}
            </span>
            <span class="inline-flex items-center gap-1" aria-label="歌曲数量">
              <LucideMusic class="size-4 shrink-0" aria-hidden="true" />
              {{ playlist.songCount }}
            </span>
            <span class="inline-flex items-center gap-1" aria-label="总时长">
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
              <LucideClock class="size-3" />
              审核中
            </span>
            <span
              v-else-if="reviewStatus === 'rejected'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400"
            >
              <LucideCircleX class="size-3" />
              审核已驳回
            </span>
            <span
              v-else-if="reviewStatus === 'approved'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400"
            >
              <LucideCircleCheck class="size-3" />
              审核已通过
            </span>
            <AsyncFade>
              <span v-if="reviewStatus === 'rejected' && isReviewLoading" class="text-xs text-gray-400" role="status">
                加载中...
              </span>
              <span v-else-if="reviewStatus === 'rejected' && isReviewError" class="text-xs text-gray-400" role="alert">
                审核原因加载失败
                <button type="button" class="ml-1 text-blue-500 cursor-pointer" @click="refetchReview()">
                  重试
                </button>
              </span>
              <span v-else-if="reviewStatus === 'rejected' && reviewDetail?.reason" class="text-xs text-gray-500 dark:text-gray-400">
                原因：{{ reviewDetail.reason }}
              </span>
            </AsyncFade>
            <button
              v-if="reviewStatus === 'pending'"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              :disabled="cancellingReview"
              @click="cancelReview"
            >
              {{ cancellingReview ? '取消中...' : '撤销申请' }}
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
        <SegmentSwitch v-model="activeTab" :options="tabOptions" block aria-label="歌单内容" />
      </div>
      <div v-if="sorting" class="mt-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300" role="status">
        拖动右侧手柄调整歌曲顺序，完成后点击保存
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
              empty-text="歌单暂无歌曲"
              @reorder-start="sortDragging = true"
              @reorder-end="onDragEnd"
            >
              <template v-if="canEdit && !sorting" #row-actions="{ song }">
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
              {{ descriptionExpanded ? '收起介绍' : '展开介绍' }}
            </button>
          </div>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">
            暂无介绍
          </p>
          <dl class="detail-facts mt-4 text-sm">
            <dt class="text-gray-500 dark:text-gray-400">
              更新于
            </dt>
            <dd>{{ getPublishDate(playlist.updatedAt) }}</dd>
            <dt class="text-gray-500 dark:text-gray-400">
              可见范围
            </dt>
            <dd>{{ playlist.isPublic ? '公开' : '仅自己可见' }}</dd>
          </dl>
        </aside>
      </div>

      <Teleport to="body">
        <div v-if="sorting" class="fixed bottom-20 left-4 right-4 md:left-auto md:w-96 z-40 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-[var(--theme-surface)]/95 backdrop-blur-xl shadow-xl p-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ orderChanged ? '顺序未保存' : '调整顺序' }}</span>
          <div class="flex gap-2 shrink-0">
            <AppButton variant="outline" :disabled="savingOrder || sortDragging" @click="cancelSorting">
              取消
            </AppButton>
            <AppButton variant="primary" :disabled="!orderChanged || savingOrder || sortDragging" @click="saveSorting">
              <LucideLoader2 v-if="savingOrder" class="size-4 animate-spin" />
              {{ savingOrder ? '保存中...' : '保存顺序' }}
            </AppButton>
          </div>
        </div>
        <Transition name="action-bar">
          <div
            v-if="selectedIds.size > 0"
            class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 whitespace-nowrap"
          >
            <span class="text-sm text-white/70">已选 {{ selectedIds.size }} 首</span>
            <div class="w-px h-4 bg-white/20 dark:bg-[var(--theme-surface)]/20" />
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
              <div class="w-px h-4 bg-white/20 dark:bg-[var(--theme-surface)]/20" />
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

      <AppDialog v-model="showUnsavedOrderDialog" title="歌曲顺序尚未保存">
        <div class="px-6 py-5 text-sm text-gray-600 dark:text-gray-400">
          离开前是否保存调整后的歌曲顺序？
        </div>
        <template #footer>
          <div class="px-4 py-3 flex flex-wrap justify-end gap-2">
            <AppButton variant="outline" :disabled="savingOrder" @click="finishNavigation(false)">
              继续调整
            </AppButton>
            <AppButton variant="danger" :disabled="savingOrder" @click="discardAndLeave">
              放弃更改
            </AppButton>
            <AppButton variant="primary" :disabled="savingOrder" @click="saveAndLeave">
              <LucideLoader2 v-if="savingOrder" class="size-4 animate-spin" />
              {{ savingOrder ? '保存中...' : '保存并离开' }}
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
      <AppDialog v-model="showDeleteConfirm" title="删除歌单">
        <div class="px-6 py-5 text-sm text-gray-600 dark:text-gray-400">
          <p>确定要删除歌单「{{ playlist?.name }}」吗？</p>
          <p class="mt-2 text-red-500">
            删除后无法恢复
          </p>
        </div>
        <template #footer>
          <div class="px-6 py-3 flex justify-end gap-2">
            <AppButton variant="outline" :disabled="deletingPlaylist" @click="showDeleteConfirm = false">
              取消
            </AppButton>
            <AppButton variant="danger" :disabled="deletingPlaylist" @click="deletePlaylist">
              <LucideLoader2 v-if="deletingPlaylist" class="size-4 animate-spin" />
              {{ deletingPlaylist ? '删除中...' : '确认删除' }}
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

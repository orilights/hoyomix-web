<script setup lang="ts">
import type { PlaylistSongItem } from '@/types/core'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { cancelPlaylistReviewApi, deletePlaylistApi, getPlaylistReviewApi, updatePlaylistSongsApi } from '@/api/music'
import { useCommentThreadsQuery, usePlaylistDetailQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl, getPublishDate } from '@/utils'
import { NotFoundError } from '@/utils/fetch'

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

function scrollToComments() {
  commentSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const activeTab = ref<'songs' | 'comments'>('songs')

watch([commentPostId, () => route.query.commentPostId], ([postId, targetPostId]) => {
  if (postId && targetPostId === postId)
    activeTab.value = 'comments'
}, { immediate: true })

watch(playlistId, () => {
  activeTab.value = 'songs'
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

const showMultiSelect = ref(false)
const selectedIds = ref<Set<number>>(new Set())

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
              :show-comments="playlist.isPublic"
              :comment-count="commentCount"
              @play-all="playAll"
              @add-all="addAllToPlaylist"
              @toggle-multi-select="toggleMultiSelect"
              @edit="openEdit"
              @delete="requestDeletePlaylist"
              @show-comments="scrollToComments"
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
          :show-comments="playlist.isPublic"
          :comment-count="commentCount"
          @play-all="playAll"
          @add-all="addAllToPlaylist"
          @toggle-multi-select="toggleMultiSelect"
          @edit="openEdit"
          @delete="requestDeletePlaylist"
          @show-comments="scrollToComments"
        />
      </div>

      <div v-if="playlist.isPublic" class="flex gap-2 mt-4 lg:hidden">
        <button
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'songs' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'songs'"
        >
          歌曲列表
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'comments' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'comments'"
        >
          评论 {{ commentCount }}
        </button>
      </div>

      <div v-show="activeTab === 'songs' || !playlist.isPublic" class="mt-4 lg:!block">
        <SongList
          v-model:songs="localSongs"
          v-model:selected-ids="selectedIds"
          :playlist-id="playlistId"
          :selectable="showMultiSelect"
          :reorderable="canEdit"
          :busy="savingOrder"
          empty-text="歌单暂无歌曲"
          @reorder-end="onDragEnd"
        >
          <template v-if="canEdit" #row-actions="{ song }">
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

      <div v-if="playlist.isPublic" v-show="activeTab === 'comments'" ref="commentSection" class="lg:!block">
        <CommentSection :post-id="`hoyomix:playlist:${playlist.id}`" />
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
      <AppDialog v-model="showDeleteConfirm" title="删除歌单">
        <div class="px-6 py-5 text-sm text-gray-600">
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
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.action-bar-enter-from,
.action-bar-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>

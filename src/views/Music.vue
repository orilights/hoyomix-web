<script setup lang="ts">
import type { SongListItemInfo } from '@/types/core'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAlbumInfoQuery, useCommentThreadsQuery, usePlaylistDetailQuery, useSongInfoQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { usePendingSongEditRequest } from '@/composables/usePendingSongEditRequest'
import { vPageEnter } from '@/directives/page-enter'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { buildPlaylistItem, formatDuration, getCoverUrl, getProductCode, getProductIconUrl, selectLyricProvider } from '@/utils'
import { NotFoundError } from '@/utils/fetch'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()
const queryClient = useQueryClient()

const { lyricsSource } = storeToRefs(player)

const isPlaylistContext = computed(() => route.name === 'PlaylistMusicInfo')
const detailPlaylistId = computed(() => (isPlaylistContext.value ? (route.params.playlistId as string) : null))
const { data: playlistDetail } = usePlaylistDetailQuery(detailPlaylistId)

const musicId = computed(() => Number(route.params.musicId))
const currentPlaylistSong = computed(() => {
  if (!isPlaylistContext.value || !playlistDetail.value)
    return null
  return playlistDetail.value.songs.find(song => song.songId === musicId.value) || null
})

const albumId = computed(() => {
  if (isPlaylistContext.value)
    return currentPlaylistSong.value?.albumId ?? null
  return Number(route.params.albumId as string) || null
})

const { data: albumInfo, isLoading, isError: isAlbumError, error: albumError } = useAlbumInfoQuery(albumId)
const { data: songInfo, isLoading: isSongLoading, isError: isSongError, error: songError } = useSongInfoQuery(musicId)
const showDiscName = computed(() => new Set(albumInfo.value?.songs.map(song => song.disc)).size > 1)

const musicInfo = computed<SongListItemInfo | null>(() => {
  if (isPlaylistContext.value) {
    const song = currentPlaylistSong.value
    if (!song)
      return null
    return {
      id: song.songId,
      name: song.songName,
      description: song.songDescription,
      disc: '',
      track: 0,
      duration: song.duration,
      platforms: song.platforms,
    }
  }
  if (albumInfo.value) {
    return albumInfo.value.songs.find(song => song.id === musicId.value) || null
  }
  return null
})

const lyricProvider = computed(() => {
  return musicInfo.value?.platforms ? selectLyricProvider(musicInfo.value.platforms, lyricsSource.value) : null
})
const lyricSongId = computed(() => musicInfo.value?.id ?? null)

const hasNcmPlatform = computed(() => !!musicInfo.value?.platforms?.ncm)
const hasQQPlatform = computed(() => !!musicInfo.value?.platforms?.qq)

watch(isAlbumError, (val) => {
  if (!val)
    return
  if (albumError.value instanceof NotFoundError)
    router.replace({ path: '/404', query: { errorMessage: albumError.value?.message } })
  else
    toast.error(`歌曲信息加载失败：${albumError.value?.message ?? '未知错误'}`)
})

// 专辑加载成功但歌曲不存在于该专辑中，跳转 404 页面
watch([() => !!albumInfo.value, musicInfo], ([hasAlbum, song]) => {
  if (hasAlbum && !song) {
    router.replace({ path: '/404', query: { errorMessage: '歌曲不存在' } })
  }
})

// 歌单加载成功但歌曲不存在于该歌单中，跳转 404 页面
watch([() => !!playlistDetail.value, musicInfo], ([hasPlaylist, song]) => {
  if (isPlaylistContext.value && hasPlaylist && !song) {
    router.replace({ path: '/404', query: { errorMessage: '歌曲不存在' } })
  }
})

watch(isSongError, (val) => {
  if (!val)
    return
  if (songError.value instanceof NotFoundError)
    router.replace({ path: '/404', query: { errorMessage: songError.value?.message } })
})

function handlePlay() {
  if (musicInfo.value) {
    const song = buildPlaylistItem(musicInfo.value, albumInfo.value!)
    const wasCurrent = player.currentSong?.songId === song.songId
    player.insertNextAndPlay(song)
    toast.success(wasCurrent ? '已重新播放当前歌曲' : '已插入下一首并播放')
  }
}

function findCurrentSongIndex() {
  if (isPlaylistContext.value && playlistDetail.value) {
    return playlistDetail.value.songs.findIndex(song => song.songId === musicId.value)
  }
  return albumInfo.value?.songs.findIndex(song => song.id === musicId.value) ?? -1
}

function goPrevMusic() {
  const index = findCurrentSongIndex()
  if (isPlaylistContext.value && playlistDetail.value) {
    if (index > 0) {
      router.push({ name: 'PlaylistMusicInfo', params: { playlistId: detailPlaylistId.value, musicId: playlistDetail.value.songs[index - 1].songId } })
    }
    return
  }
  if (index > 0) {
    router.push({ name: 'MusicInfo', params: { albumId: albumId.value, musicId: albumInfo.value!.songs[index - 1].id } })
  }
}

function goNextMusic() {
  const index = findCurrentSongIndex()
  if (isPlaylistContext.value && playlistDetail.value) {
    if (index >= 0 && index < playlistDetail.value.songs.length - 1) {
      router.push({ name: 'PlaylistMusicInfo', params: { playlistId: detailPlaylistId.value, musicId: playlistDetail.value.songs[index + 1].songId } })
    }
    return
  }
  if (index < albumInfo.value!.songs.length - 1) {
    router.push({ name: 'MusicInfo', params: { albumId: albumId.value, musicId: albumInfo.value!.songs[index + 1].id } })
  }
}

const hasPrev = computed(() => {
  if (isPlaylistContext.value && playlistDetail.value)
    return playlistDetail.value.songs.findIndex(song => song.songId === musicId.value) > 0
  if (albumInfo.value)
    return albumInfo.value.songs.findIndex(song => song.id === musicId.value) > 0
  return true
})

const hasNext = computed(() => {
  if (isPlaylistContext.value && playlistDetail.value) {
    const index = playlistDetail.value.songs.findIndex(song => song.songId === musicId.value)
    return index >= 0 && index < playlistDetail.value.songs.length - 1
  }
  if (albumInfo.value) {
    const index = albumInfo.value.songs.findIndex(song => song.id === musicId.value)
    return index >= 0 && index < albumInfo.value.songs.length - 1
  }
  return true
})

const musicCoverUrl = computed(() =>
  albumInfo.value ? getCoverUrl(albumInfo.value.platforms, '512px') : '',
)

const musicPagePath = computed(() => {
  if (isPlaylistContext.value && detailPlaylistId.value && musicId.value)
    return `/playlist/${detailPlaylistId.value}/music/${musicId.value}`
  if (albumId.value && musicId.value)
    return `/album/${albumId.value}/music/${musicId.value}`
  return null
})

usePageSeo({
  title: computed(() => musicInfo.value?.name ?? null),
  description: computed(() => {
    const song = musicInfo.value
    const album = albumInfo.value
    if (!song)
      return null
    const parts = [song.description]
    if (album)
      parts.push(`收录于专辑《${album.name}》`)
    return parts.filter(Boolean).join('，') || null
  }),
  path: musicPagePath,
  image: musicCoverUrl,
})

watch([musicInfo, albumInfo], ([song, album]) => {
  if (song && album) {
    store.setBackground(getCoverUrl(album.platforms, '128px'))
  }
}, { immediate: true })

const activeTab = ref<'info' | 'artists' | 'contributions' | 'comments'>('info')

watch(musicId, () => {
  activeTab.value = 'info'
})

const commentPostId = computed(() => musicInfo.value ? `hoyomix:song:${musicInfo.value.id}` : null)

watch([commentPostId, () => route.query.commentPostId], ([postId, targetPostId]) => {
  if (postId && targetPostId === postId)
    activeTab.value = 'comments'
}, { immediate: true })
const commentUserId = computed(() => auth.user?.id ?? null)
const commentPage = ref(1)
const { data: commentThreads } = useCommentThreadsQuery(commentPostId, commentUserId, commentPage)
const commentCount = computed(() => commentThreads.value?.commentCount ?? commentThreads.value?.pagination.total ?? 0)
const commentSection = ref<HTMLElement | null>(null)

async function scrollToComments() {
  activeTab.value = 'comments'
  await nextTick()
  commentSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const showSelectPlaylistDialog = ref(false)
const currentSongId = computed(() => musicInfo.value ? [musicInfo.value.id] : [])

function addSongToUserPlaylist() {
  if (!auth.requireLogin())
    return
  showSelectPlaylistDialog.value = true
}

const productCode = computed(() => getProductCode(albumInfo.value?.productName ?? ''))

const showEditRegionDialog = ref(false)
const showEditVideoDialog = ref(false)
const showEditInfoDialog = ref(false)
const showMyRequestsDialog = ref(false)
const requestPage = ref(1)
const { pendingRequest } = usePendingSongEditRequest(musicId)
const requestParams = computed(() => ({ resourceType: 'song' as const, resourceId: musicId.value, page: requestPage.value, limit: 10 }))
function openMyRequests() {
  if (!auth.requireLogin())
    return
  requestPage.value = 1
  showMyRequestsDialog.value = true
}
watch(() => [musicId.value, auth.user?.id], () => {
  showMyRequestsDialog.value = false
  showEditInfoDialog.value = false
  showEditRegionDialog.value = false
  showEditVideoDialog.value = false
  requestPage.value = 1
}, { flush: 'sync' })

function openEditInfo() {
  if (!auth.requireLogin())
    return
  if (isSongLoading.value || isSongError.value || songInfo.value?.id !== musicId.value) {
    toast.error('歌曲详情尚未加载完成，请稍后重试')
    return
  }
  showEditInfoDialog.value = true
}

function openEditRegion() {
  if (!auth.requireLogin())
    return
  showEditRegionDialog.value = true
}

function openEditVideo() {
  if (!auth.requireLogin())
    return
  showEditVideoDialog.value = true
}

function refreshSongInfo() {
  queryClient.invalidateQueries({ queryKey: ['editRequests'] })
  queryClient.invalidateQueries({ queryKey: ['editRequestDetail'] })
  queryClient.invalidateQueries({ queryKey: ['songInfo', musicId.value] })
  queryClient.invalidateQueries({ queryKey: ['albumInfo', albumId.value] })
  if (isPlaylistContext.value)
    queryClient.invalidateQueries({ queryKey: ['playlistDetail', detailPlaylistId.value] })
  queryClient.invalidateQueries({ queryKey: ['contributions', 'song', musicId.value] })
}
</script>

<template>
  <AsyncFade>
    <div v-if="isLoading" class="flex items-center justify-center py-20 text-gray-400">
      <LucideLoader2 class="size-6 animate-spin mr-2" />
      加载中...
    </div>

    <div v-else-if="isAlbumError" class="flex items-center justify-center py-20 text-red-400">
      加载失败，请刷新重试
    </div>

    <div v-else-if="albumInfo && musicInfo" class="music-page detail-page">
      <div v-page-enter="0" class="detail-header">
        <div class="detail-cover rounded-2xl shrink-0 shadow-md overflow-hidden">
          <CoverImage :src="getCoverUrl(albumInfo.platforms, '256px')" />
        </div>
        <div class="min-w-0">
          <div class="detail-title font-bold break-words" :title="musicInfo.name">
            {{ musicInfo.name }}
          </div>
          <p v-if="musicInfo.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400 break-words">
            {{ musicInfo.description }}
          </p>
          <div class="detail-meta mt-1 flex items-center flex-wrap text-sm">
            <RouterLink
              :to="{ name: 'ProductInfo', params: { name: albumInfo.productName } }"
              class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              <LazyImg class="size-5 rounded-full" :src="getProductIconUrl(albumInfo.productName, '48px')" />
              <span class="ml-2">{{ albumInfo.productName }}</span>
            </RouterLink>
            <span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400" aria-label="时长">
              <LucideClock class="size-4 shrink-0" aria-hidden="true" />
              {{ formatDuration(musicInfo.duration) }}
            </span>
          </div>
        </div>
        <div class="detail-actions">
          <MusicActions
            :music-info="musicInfo"
            :is-playlist-context="isPlaylistContext"
            :prev-disabled="!hasPrev"
            :next-disabled="!hasNext"
            :can-edit-region="productCode === 'genshin'"
            :has-pending-edit-request="!!pendingRequest"
            :comment-count="commentCount"
            @play="handlePlay"
            @prev="goPrevMusic"
            @next="goNextMusic"
            @add-to-playlist="addSongToUserPlaylist"
            @my-requests="openMyRequests"
            @edit-info="openEditInfo"
            @edit-region="openEditRegion"
            @edit-video="openEditVideo"
            @show-comments="scrollToComments"
          />
        </div>
      </div>

      <div class="detail-tabs">
        <SegmentSwitch
          v-model="activeTab"
          :options="[{ key: 'info', label: '资料' }, { key: 'artists', label: '制作人员' }, { key: 'contributions', label: '贡献信息' }, { key: 'comments', label: `评论 ${commentCount}` }]"
          block
          aria-label="歌曲内容"
        />
      </div>

      <div class="detail-content">
        <div v-show="activeTab === 'info' || activeTab === 'comments'" class="detail-desktop-visible min-w-0">
          <div v-show="activeTab === 'info'" class="detail-desktop-visible">
            <section v-page-enter="120">
              <dl class="detail-facts text-sm p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                <template v-if="songInfo?.descriptionFull">
                  <dt class="text-gray-500 dark:text-gray-400">
                    简介
                  </dt>
                  <dd class="mb-4 text-sm">
                    <p
                      id="music-description-content"
                      class="whitespace-pre-wrap break-words"
                    >
                      {{ songInfo.descriptionFull }}
                    </p>
                  </dd>
                </template>

                <dt class="text-gray-500 dark:text-gray-400">
                  所属专辑
                </dt>
                <dd class="min-w-0 break-words">
                  <RouterLink :to="{ name: 'AlbumInfo', params: { id: albumInfo.id } }" class="text-blue-500 hover:text-blue-600">
                    {{ albumInfo.name }}
                  </RouterLink>
                </dd>
                <template v-if="showDiscName && musicInfo.disc">
                  <dt class="text-gray-500 dark:text-gray-400">
                    分碟
                  </dt>
                  <dd class="min-w-0 break-words">
                    {{ musicInfo.disc }}
                  </dd>
                </template>
                <template v-if="musicInfo.track">
                  <dt class="text-gray-500 dark:text-gray-400">
                    序号
                  </dt>
                  <dd>{{ musicInfo.track }}</dd>
                </template>
                <template v-if="isPlaylistContext && playlistDetail">
                  <dt class="text-gray-500 dark:text-gray-400">
                    来自歌单
                  </dt>
                  <dd class="min-w-0 break-words">
                    <RouterLink :to="{ name: 'PlaylistDetail', params: { id: playlistDetail.id } }" class="text-blue-500 hover:text-blue-600">
                      {{ playlistDetail.name }}
                    </RouterLink>
                  </dd>
                </template>
              </dl>

              <div class="mt-4">
                <AsyncFade>
                  <div v-if="isSongLoading" class="flex items-center justify-center gap-2 py-2 text-gray-400">
                    <LucideLoader2 class="size-4 animate-spin" />
                    加载中...
                  </div>
                  <p v-else-if="isSongError" class="py-2 text-sm text-red-400">
                    加载失败，请刷新重试
                  </p>
                  <div v-else>
                    <TagList v-if="songInfo?.tags.length || songInfo?.maps?.length" :tags="songInfo.tags" :maps="songInfo.maps" />
                  </div>
                </AsyncFade>
              </div>
            </section>

            <section v-page-enter="240" class="mt-4">
              <MusicLyrics
                :lyric-provider="lyricProvider"
                :lyric-song-id="lyricSongId"
                :has-ncm-platform="hasNcmPlatform"
                :has-qq-platform="hasQQPlatform"
              />
            </section>
          </div>
          <div v-show="activeTab === 'comments'" ref="commentSection" v-page-enter="route.query.commentId ? false : 360" class="detail-comments detail-desktop-visible">
            <CommentSection :post-id="`hoyomix:song:${musicInfo.id}`" />
          </div>
        </div>
        <div v-show="activeTab === 'artists' || activeTab === 'contributions'" class="detail-sidebar detail-sidebar-stack detail-desktop-visible min-w-0">
          <div v-show="activeTab === 'artists'" v-page-enter="120" class="detail-desktop-visible">
            <ArtistListByType :id="musicId" type="song" />
          </div>
          <div v-show="activeTab === 'contributions'" v-page-enter="240" class="detail-desktop-visible">
            <ContributionCard :id="musicId" type="song" />
          </div>
        </div>
      </div>

      <SelectPlaylistDialog
        v-model="showSelectPlaylistDialog"
        :song-ids="currentSongId"
        mode="add"
      />

      <AppDialog v-model="showMyRequestsDialog" title="我的申请" size="md">
        <div class="p-4 sm:p-6 max-h-[65vh] overflow-y-auto overscroll-contain">
          <EditRequestList v-if="showMyRequestsDialog" :params="requestParams" @page="requestPage = $event" />
        </div>
      </AppDialog>

      <SongInfoEditDialog
        v-model="showEditInfoDialog"
        :song-id="musicId"
        :name="musicInfo?.name ?? ''"
        :description="musicInfo?.description ?? ''"
        :description-full="!isSongLoading && !isSongError && songInfo?.id === musicId ? songInfo.descriptionFull : undefined"
        @success="refreshSongInfo"
      />

      <SongRegionEditDialog
        v-model="showEditRegionDialog"
        :song-id="musicId"
        :game="productCode"
        :maps="songInfo?.maps ?? []"
        @success="refreshSongInfo"
      />

      <SongVideoEditDialog
        v-model="showEditVideoDialog"
        :song-id="musicId"
        :tags="songInfo?.tags ?? []"
        @success="refreshSongInfo"
      />
    </div>
  </AsyncFade>
</template>

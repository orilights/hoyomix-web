<script setup lang="ts">
import type { SongListItemInfo } from '@/types/core'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAlbumInfoQuery, useCommentThreadsQuery, usePlaylistDetailQuery, useSongInfoQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
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

const activeTab = ref<'lyrics' | 'artists' | 'comments'>('lyrics')

watch(musicId, () => {
  activeTab.value = 'lyrics'
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

function scrollToComments() {
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

function openEditInfo() {
  if (!auth.requireLogin())
    return
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
  queryClient.invalidateQueries({ queryKey: ['songInfo', musicId.value] })
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

    <div v-else-if="albumInfo && musicInfo" class="overflow-hidden">
      <div class="flex md:h-[200px] lg:h-[300px]">
        <div class="size-[100px] md:size-[200px] lg:size-[300px] rounded-2xl shrink-0 shadow-md overflow-hidden">
          <CoverImage :src="getCoverUrl(albumInfo.platforms, '800px')" />
        </div>

        <div class="flex flex-col ml-4 md:ml-8 overflow-hidden">
          <div class="truncate shrink-0 md:text-xl lg:text-3xl font-bold">
            {{ musicInfo.name }}
          </div>

          <div v-if="musicInfo.description" class="truncate shrink-0 text-sm mt-1 md:text-base lg:text-lg text-gray-500">
            {{ musicInfo.description }}
          </div>

          <div class="mt-1 md:mt-2 flex items-center gap-x-2 text-nowrap text-sm md:text-base">
            <span class="text-gray-500 hidden md:inline">所属</span>
            <RouterLink
              :to="{ name: 'ProductInfo', params: { name: albumInfo.productName } }"
              class="flex items-center hover:bg-gray-500/20 p-1 rounded-lg transition-colors shrink-0"
              :title="albumInfo.productName"
            >
              <LazyImg class="size-5 md:size-8 rounded-full" :src="getProductIconUrl(albumInfo.productName, '48px')" />
            </RouterLink>
            <span class="text-gray-500 hidden md:inline">收录于</span>
            <RouterLink
              :to="{ name: 'AlbumInfo', params: { id: albumInfo.id } }"
              class="hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors truncate"
            >
              {{ albumInfo.name }}
            </RouterLink>
          </div>

          <div class="mt-1 md:mt-2 flex items-center flex-wrap text-sm md:text-base">
            <span class="text-gray-500">时长</span>
            <span class="ml-4">
              {{ formatDuration(musicInfo.duration) }}
            </span>
          </div>

          <div class="hidden md:flex gap-2 pt-2 mt-auto flex-wrap shrink-0">
            <MusicActions
              :music-info="musicInfo"
              :is-playlist-context="isPlaylistContext"
              :prev-disabled="!hasPrev"
              :next-disabled="!hasNext"
              :can-edit-region="productCode === 'genshin'"
              :comment-count="commentCount"
              @play="handlePlay"
              @prev="goPrevMusic"
              @next="goNextMusic"
              @add-to-playlist="addSongToUserPlaylist"
              @edit-info="openEditInfo"
              @edit-region="openEditRegion"
              @edit-video="openEditVideo"
              @show-comments="scrollToComments"
            />
          </div>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap md:hidden mt-4">
        <MusicActions
          :music-info="musicInfo"
          :is-playlist-context="isPlaylistContext"
          :prev-disabled="!hasPrev"
          :next-disabled="!hasNext"
          :can-edit-region="productCode === 'genshin'"
          :comment-count="commentCount"
          @play="handlePlay"
          @prev="goPrevMusic"
          @next="goNextMusic"
          @add-to-playlist="addSongToUserPlaylist"
          @edit-info="openEditInfo"
          @edit-region="openEditRegion"
          @edit-video="openEditVideo"
          @show-comments="scrollToComments"
        />
      </div>

      <div v-if="isSongLoading || isSongError || songInfo?.tags.length || songInfo?.maps?.length" class="mt-4 lg:hidden">
        <AsyncFade>
          <div v-if="isSongLoading" class="flex items-center justify-center py-2 text-gray-400">
            <LucideLoader2 class="size-6 animate-spin mr-2" />
            加载中...
          </div>
          <div v-else-if="isSongError" class="flex items-center justify-center py-2 text-red-400">
            加载失败，请刷新重试
          </div>
          <TagList v-else-if="songInfo?.tags.length || songInfo?.maps?.length" :tags="songInfo.tags" :maps="songInfo.maps" />
        </AsyncFade>
      </div>

      <div class="flex flex-wrap gap-2 mt-4 lg:hidden">
        <button
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'lyrics' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'lyrics'"
        >
          歌词
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'artists' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'artists'"
        >
          制作人员
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'comments' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'comments'"
        >
          评论 {{ commentCount }}
        </button>
      </div>

      <div v-show="activeTab !== 'comments'" class="flex flex-col lg:!flex lg:flex-row lg:gap-4 mt-4">
        <div class="w-full lg:w-[400px]">
          <div v-if="isSongLoading || isSongError || songInfo?.tags.length || songInfo?.maps?.length" class="w-full lg:w-[400px] h-fit lg:mb-4 hidden lg:block">
            <AsyncFade>
              <div v-if="isSongLoading" class="flex items-center justify-center py-2 text-gray-400">
                <LucideLoader2 class="size-6 animate-spin mr-2" />
                加载中...
              </div>
              <div v-else-if="isSongError" class="flex items-center justify-center py-2 text-red-400">
                加载失败，请刷新重试
              </div>
              <TagList v-else-if="songInfo?.tags.length || songInfo?.maps?.length" :tags="songInfo.tags" :maps="songInfo.maps" />
            </AsyncFade>
          </div>

          <div v-show="activeTab === 'artists'" class="w-full lg:w-[400px] p-4 bg-black/5 rounded-xl lg:!block h-fit" :class="{ hidden: activeTab !== 'artists' }">
            <ArtistListByType :id="musicId" type="song" />
          </div>
        </div>

        <div v-show="activeTab === 'lyrics'" class="flex-1 lg:!block h-fit" :class="{ hidden: activeTab !== 'lyrics' }">
          <MusicLyrics
            :lyric-provider="lyricProvider"
            :lyric-song-id="lyricSongId"
            :has-ncm-platform="hasNcmPlatform"
            :has-qq-platform="hasQQPlatform"
          />
        </div>
      </div>

      <div v-show="activeTab === 'comments'" ref="commentSection" class="lg:!block">
        <CommentSection :post-id="`hoyomix:song:${musicInfo.id}`" />
      </div>

      <SelectPlaylistDialog
        v-model="showSelectPlaylistDialog"
        :song-ids="currentSongId"
        mode="add"
      />

      <SongInfoEditDialog
        v-model="showEditInfoDialog"
        :song-id="musicId"
        :name="musicInfo?.name ?? ''"
        :description="musicInfo?.description ?? ''"
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

<style scoped>
</style>

<script setup lang="ts">
import type { SongListItemInfo } from '@/types/core'
import { toast } from 'vue-sonner'
import { NotFoundError } from '@/api/music'
import { useAlbumInfoQuery, useLyricsQuery, useSongInfoQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { buildPlaylistItem, formatDuration, getCoverUrl, getProductIconUrl, goNeteaseClient, mergeLyrics, selectLyricProvider } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()

const { lyricsSource } = storeToRefs(player)

const albumId = computed(() => Number(route.params.albumId as string) || null)
const musicId = computed(() => Number(route.params.musicId))

const { data: albumInfo, isLoading, isError: isAlbumError, error: albumError } = useAlbumInfoQuery(albumId)
const { data: songInfo, isLoading: isSongLoading, isError: isSongError, error: songError } = useSongInfoQuery(musicId)

const musicInfo = computed<SongListItemInfo | null>(() => {
  if (albumInfo.value) {
    return albumInfo.value.songs.find(song => song.id === musicId.value) || null
  }
  return null
})

const lyricProvider = computed(() => {
  return musicInfo.value?.platforms ? selectLyricProvider(musicInfo.value.platforms, lyricsSource.value) : null
})
const lyricSongId = computed(() => musicInfo.value?.id ?? null)

const { data: lyricsData, isLoading: isLyricsLoading, isError: isLyricsError, error: lyricsError } = useLyricsQuery(lyricProvider, lyricSongId)

const lyricList = computed(() => {
  if (!lyricsData.value)
    return []
  return mergeLyrics(lyricsData.value.content, lyricsData.value.translation ?? '')
})

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

watch(isSongError, (val) => {
  if (!val)
    return
  if (songError.value instanceof NotFoundError)
    router.replace({ path: '/404', query: { errorMessage: songError.value?.message } })
})

watch(isLyricsError, (val) => {
  if (!val || lyricsError.value instanceof NotFoundError)
    return
  toast.error(`歌词加载失败：${lyricsError.value?.message ?? '未知错误'}`)
})

const neteaseOptions = computed(() => [
  {
    label: '跳转至详情页',
    onClick: () => {
      window.open(`https://music.163.com/#/song?id=${musicInfo.value!.platforms.ncm!.id}`)
    },
  },
  {
    label: '在 APP 中播放',
    onClick: () => {
      goNeteaseClient({
        type: 'song',
        id: musicInfo.value!.platforms.ncm!.id,
        cmd: 'play',
      })
    },
  },
])

const qqMusicOptions = computed(() => [
  {
    label: '跳转至详情页',
    onClick: () => {
      window.open(`https://y.qq.com/n/ryqq_v2/songDetail/${musicInfo.value!.platforms.qq!.id}`)
    },
  },
])

function handlePlay() {
  if (musicInfo.value) {
    const { index, isNew } = player.addToPlaylist(buildPlaylistItem(musicInfo.value, albumInfo.value!))
    player.playSong(index)
    if (isNew) {
      toast.success('已添加至播放列表并播放')
    }
  }
}

function goPrevMusic() {
  const index = albumInfo.value!.songs.findIndex(song => song.id === musicId.value)
  if (index > 0) {
    router.push({ name: 'MusicInfo', params: { albumId: albumId.value, musicId: albumInfo.value!.songs[index - 1].id } })
  }
}

function goNextMusic() {
  const index = albumInfo.value!.songs.findIndex(song => song.id === musicId.value)
  if (index < albumInfo.value!.songs.length - 1) {
    router.push({ name: 'MusicInfo', params: { albumId: albumId.value, musicId: albumInfo.value!.songs[index + 1].id } })
  }
}

watch(musicInfo, (val) => {
  if (val) {
    document.title = `${val.name} - HOYO-MiX Online`
    store.setBackground(getCoverUrl(albumInfo.value!.platforms, '128px'))
  }
}, { immediate: true })

const activeTab = ref<'lyrics' | 'artists'>('lyrics')

const showSelectPlaylistDialog = ref(false)
const currentSongId = computed(() => musicInfo.value ? [musicInfo.value.id] : [])

function addSongToUserPlaylist() {
  if (!auth.requireLogin())
    return
  showSelectPlaylistDialog.value = true
}

onMounted(() => {
  document.documentElement.scrollTo(0, 0)
})
</script>

<template>
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
        <div class="truncate md:text-xl lg:text-3xl font-bold">
          {{ musicInfo.name }}
        </div>

        <div v-if="musicInfo.description" class="truncate text-sm mt-1 md:text-base lg:text-lg text-gray-500">
          {{ musicInfo.description }}
        </div>

        <div class="mt-1 md:mt-2 flex items-center gap-x-2 text-nowrap text-sm md:text-base">
          <span class="text-gray-500 hidden md:inline">所属</span>
          <RouterLink
            :to="{ name: 'ProductInfo', params: { name: albumInfo.productName } }"
            class="flex items-center hover:bg-gray-500/20 p-1 rounded-lg transition-colors shrink-0"
            :title="albumInfo.productName"
          >
            <img class="size-5 md:size-8" :src="getProductIconUrl(albumInfo.productName, '48px')">
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
            show-tooltip
            dropdown-position="up"
            :ncm-options="musicInfo.platforms.ncm ? neteaseOptions : undefined"
            :qq-options="musicInfo.platforms.qq ? qqMusicOptions : undefined"
            @play="handlePlay"
            @prev="goPrevMusic"
            @next="goNextMusic"
            @add-to-playlist="addSongToUserPlaylist"
          />
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-wrap md:hidden mt-4">
      <MusicActions
        :ncm-options="musicInfo.platforms.ncm ? neteaseOptions : undefined"
        :qq-options="musicInfo.platforms.qq ? qqMusicOptions : undefined"
        @play="handlePlay"
        @prev="goPrevMusic"
        @next="goNextMusic"
        @add-to-playlist="addSongToUserPlaylist"
      />
    </div>

    <div class="mt-4 lg:hidden">
      <template v-if="isSongLoading">
        <LucideLoader2 class="size-6 animate-spin mr-2" />
        加载中...
      </template>
      <div v-else-if="isSongError" class="text-gray-400 text-sm text-center py-4">
        加载失败，请刷新重试
      </div>
      <TagList v-else-if="songInfo" :tags="songInfo.tags" />
    </div>

    <div class="flex gap-2 mt-4 lg:hidden">
      <button
        class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        :class="activeTab === 'lyrics' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="activeTab = 'lyrics'"
      >
        歌词
      </button>
      <button
        class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        :class="activeTab === 'artists' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="activeTab = 'artists'"
      >
        制作人员
      </button>
    </div>

    <div class="flex flex-col lg:flex-row lg:gap-4 mt-4">
      <div class="w-full lg:w-[400px]">
        <div class="w-full lg:w-[400px] h-fit lg:mb-4 hidden lg:block">
          <template v-if="isSongLoading">
            <LucideLoader2 class="size-6 animate-spin mr-2" />
            加载中...
          </template>
          <div v-else-if="isSongError" class="text-gray-400 text-sm text-center py-4">
            加载失败，请刷新重试
          </div>
          <TagList v-else-if="songInfo" :tags="songInfo.tags" />
        </div>

        <div v-show="activeTab === 'artists'" class="w-full lg:w-[400px] p-4 bg-black/5 rounded-xl lg:!block h-fit" :class="{ hidden: activeTab !== 'artists' }">
          <ArtistListByType :id="musicId" type="song" />
        </div>
      </div>

      <div v-show="activeTab === 'lyrics'" class="flex-1 lg:!block h-fit" :class="{ hidden: activeTab !== 'lyrics' }">
        <div class="bg-black/5 rounded-xl overflow-hidden p-4">
          <div v-if="!lyricProvider" class="text-gray-400 text-sm text-center py-4">
            暂无数据
          </div>
          <div v-else-if="isLyricsLoading" class="flex items-center justify-center py-4 text-gray-400">
            <LucideLoader2 class="size-4 animate-spin mr-1" />
            加载中...
          </div>
          <template v-else>
            <div v-if="lyricList.length === 0" class="text-gray-400 text-sm text-center py-4">
              暂无数据
            </div>
            <div v-for="line, index in lyricList" v-else :key="index" class="my-1">
              <span>{{ line.text }}</span>
              <span v-if="line.translation" class="text-gray-500 ml-2">/ {{ line.translation }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <SelectPlaylistDialog
      v-model="showSelectPlaylistDialog"
      :song-ids="currentSongId"
      mode="add"
    />
  </div>
</template>

<style scoped>
</style>

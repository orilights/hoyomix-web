<script setup lang="ts">
import type { ExportSong } from '@/types/export'
import { toast } from 'vue-sonner'
import { useAlbumInfoQuery, useLyricsQuery, useSongInfoQuery } from '@/composables/queries'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'
import { buildPlaylistItem, formatDuration, getCoverUrl, getProductIconUrl, goNeteaseClient, mergeLyrics, selectLyricProvider } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useStore()
const player = usePlayerStore()

const albumId = computed(() => Number(route.params.albumId as string) || null)
const musicId = computed(() => Number(route.params.musicId))

const { data: albumInfo, isLoading, isError: isAlbumError } = useAlbumInfoQuery(albumId)
const { data: songInfo, isLoading: isSongLoading, isError: isSongError } = useSongInfoQuery(musicId)

const musicInfo = computed<ExportSong | null>(() => {
  if (albumInfo.value) {
    return albumInfo.value.songs.find(song => song.id === musicId.value) || null
  }
  return null
})

const lyricProvider = computed(() => {
  return musicInfo.value?.platforms ? selectLyricProvider(musicInfo.value.platforms) : null
})
const lyricSongId = computed(() => musicInfo.value?.id ?? null)

const { data: lyricsData, isLoading: isLyricsLoading, isError: isLyricsError } = useLyricsQuery(lyricProvider, lyricSongId)

const lyricList = computed(() => {
  if (!lyricsData.value)
    return []
  return mergeLyrics(lyricsData.value.content, lyricsData.value.translation ?? '')
})

watch(isAlbumError, (val) => {
  if (val)
    toast.error('歌曲信息加载失败')
})

watch(isLyricsError, (val) => {
  if (val)
    toast.error('歌词加载失败')
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
        <div class="truncate">
          <span class="md:text-xl lg:text-3xl font-bold">
            {{ musicInfo.name }}
          </span>
          <span v-if="musicInfo.description" class="hidden lg:inline ml-2 text-lg md:text-xl text-gray-500">
            {{ musicInfo.description }}
          </span>
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
            class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors truncate"
          >
            <span>{{ albumInfo.name }}</span>
          </RouterLink>
        </div>

        <div class="mt-1 md:mt-2 flex items-center flex-wrap text-sm md:text-base">
          <span class="text-gray-500">时长</span>
          <span class="ml-4">
            {{ formatDuration(musicInfo.duration) }}
          </span>
        </div>

        <div v-if="musicInfo.description" class="text-xs md:text-sm lg:hidden mt-1 md:mt-2">
          {{ musicInfo.description }}
        </div>

        <div class="hidden md:flex gap-2 pt-2 mt-auto flex-wrap shrink-0">
          <Tooltip placement="top" theme="light" content="添加至播放列表并播放">
            <button
              class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
              @click="handlePlay"
            >
              <LucidePlay class="size-4" fill="currentColor" />
              播放
            </button>
          </Tooltip>
          <button
            class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            @click="goPrevMusic"
          >
            前一首
          </button>
          <button
            class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            @click="goNextMusic"
          >
            后一首
          </button>
          <Dropdown v-if="musicInfo.platforms.ncm" position="up" :options="neteaseOptions">
            <button
              class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            >
              <IconNcm class="size-5 text-[#fc3b5b]" />
            </button>
          </Dropdown>
          <Dropdown v-if="musicInfo.platforms.qq" position="up" :options="qqMusicOptions">
            <button
              class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            >
              <IconQQ class="size-5" />
            </button>
          </Dropdown>
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-wrap md:hidden mt-4">
      <button
        class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
        @click="handlePlay"
      >
        <LucidePlay class="size-4" fill="currentColor" />
        播放
      </button>
      <button
        class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
        @click="goPrevMusic"
      >
        前一首
      </button>
      <button
        class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
        @click="goNextMusic"
      >
        后一首
      </button>
      <Dropdown v-if="musicInfo.platforms.ncm" :options="neteaseOptions">
        <button
          class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
        >
          <IconNcm class="size-5 text-[#fc3b5b]" />
        </button>
      </Dropdown>
      <Dropdown v-if="musicInfo.platforms.qq" :options="qqMusicOptions">
        <button
          class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
        >
          <IconQQ class="size-5" />
        </button>
      </Dropdown>
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
  </div>
</template>

<style scoped>
</style>

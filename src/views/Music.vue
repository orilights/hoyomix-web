<script setup lang="ts">
import type { ExportAlbum, ExportSong } from '@/types/export'
import { getAlbumInfoApi, getLyricsApi } from '@/api'
import { lyricTimeRegex } from '@/constants'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'
import { buildPlaylistItem, formatDuration, getCoverUrl, getProductIconUrl, goNeteaseClient } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useStore()
const playerStore = usePlayerStore()

const albumId = computed(() => route.params.albumId as string)
const musicId = computed(() => Number(route.params.musicId))

const albumInfo = ref<ExportAlbum | null>(null)
const musicInfo = computed<ExportSong | null>(() => {
  if (albumInfo.value) {
    return albumInfo.value.songs.find(song => song.id === musicId.value) || null
  }
  return null
})

watch(albumId, (val) => {
  if (val) {
    getAlbumInfoApi(Number(val))
      .then(res => res.json())
      .then((data: ExportAlbum) => {
        albumInfo.value = data
      })
  }
}, { immediate: true })
const lyricData = ref('')

const lyricList = computed(() => {
  return lyricData.value.split('\n').map(line => removeTimeStr(line).trim()).filter(line => !line.startsWith('[')).filter(line => line)
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

function removeTimeStr(str: string) {
  return str.replace(lyricTimeRegex, '')
}

function getLyricData() {
  if (!musicInfo.value?.platforms || Object.keys(musicInfo.value!.platforms).length === 0) {
    lyricData.value = '暂无数据'
    return
  }
  getLyricsApi(Object.keys(musicInfo.value!.platforms)[0] as 'qq' | 'ncm', musicInfo.value!.id)
    .then(res => res.json())
    .then((data) => {
      lyricData.value = data.content
    })
}

function handlePlay() {
  if (musicInfo.value) {
    const index = playerStore.addToPlaylist(buildPlaylistItem(musicInfo.value, albumInfo.value!))
    playerStore.playSong(index)
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
    getLyricData()
  }
}, { immediate: true })

const activeTab = ref<'lyrics' | 'artists'>('lyrics')

onMounted(() => {
  document.documentElement.scrollTo(0, 0)
})
</script>

<template>
  <div v-if="albumInfo && musicInfo" class="overflow-hidden">
    <div class="flex flex-col md:flex-row md:h-[300px]">
      <div class="w-full md:w-[300px] rounded-2xl shrink-0 shadow-md overflow-hidden">
        <CoverImage :src="getCoverUrl(albumInfo.platforms, '800px')" />
      </div>
      <div class="flex flex-col justify-between mt-4 md:mt-0 md:ml-8">
        <div>
          <div>
            <span class="text-2xl md:text-3xl font-bold">
              {{ musicInfo.name }}
            </span>
            <span class="ml-2 text-lg md:text-xl text-gray-500">
              {{ musicInfo.description ?? '' }}
            </span>
          </div>

          <div class="mt-2 flex items-center gap-2 flex-wrap">
            <span class="text-gray-500">所属</span>
            <RouterLink
              :to="{ name: 'ProductInfo', params: { name: albumInfo.productName } }"
              class="flex items-center hover:bg-gray-500/20 p-1 rounded-lg transition-colors"
              :title="albumInfo.productName"
            >
              <img class="size-6" :src="getProductIconUrl(albumInfo.productName, '48px')">
            </RouterLink>
            <span class="text-gray-500">收录于</span>
            <RouterLink
              :to="{ name: 'AlbumInfo', params: { id: albumInfo.id } }"
              class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              <span>{{ albumInfo.name }}</span>
            </RouterLink>
          </div>
          <div class="mt-2 flex items-center flex-wrap">
            <span class="text-gray-500">发布于</span>
            <span class="ml-4">
              {{ albumInfo.publishDate }}
            </span>
            <span class="ml-4 text-gray-500">时长</span>
            <span class="ml-4">
              {{ formatDuration(musicInfo.duration) }}
            </span>
          </div>
        </div>
        <div class="flex gap-2 mt-4 md:mt-0 flex-wrap">
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
      </div>
    </div>

    <div class="flex gap-2 mt-4 md:hidden">
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

    <div class="flex flex-col md:flex-row gap-4 mt-2 md:mt-4">
      <div v-show="activeTab === 'artists'" class="w-full md:w-[400px] p-4 bg-black/5 rounded-xl md:!block h-fit" :class="{ hidden: activeTab !== 'artists' }">
        <ArtistListByType :id="musicId" type="song" />
      </div>

      <div v-show="activeTab === 'lyrics'" class="flex-1 md:!block h-fit" :class="{ hidden: activeTab !== 'lyrics' }">
        <div class="bg-black/5 rounded-xl overflow-hidden p-4">
          <div v-for="line, index in lyricList" :key="index" class="my-1">
            {{ line }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

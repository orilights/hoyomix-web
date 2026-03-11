<script setup lang="ts">
import type { ExportAlbum, ExportSong } from '@/types/export'
import { getAlbumInfoApi } from '@/api'
import { apiBase } from '@/constants'
import { useStore } from '@/store'
import { getCoverUrl, goFeedbackPage, goNeteaseClient } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useStore()

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
  return lyricData.value.split('\n').map(line => removeTimeStr(line).trim()).filter(line => line)
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

function removeTimeStr(str: string) {
  return str.replace(/\[\d{2}:\d{2}\.\d{2,3}(?:\.\d{3})?\]/g, '')
}

function getLyricData() {
  fetch(`${apiBase}/lyric/ncm/${musicInfo.value!.platforms.ncm!.id}.lrc`)
    .then(res => res.text())
    .then((data) => {
      lyricData.value = data
    })
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
    store.setBackground(getCoverUrl(albumInfo.value!.platforms, '200px'))
    getLyricData()
  }
}, { immediate: true })

onMounted(() => {
  document.documentElement.scrollTo(0, 0)
})
</script>

<template>
  <div v-if="albumInfo && musicInfo" class="overflow-hidden">
    <div class="h-[300px] flex">
      <div class="w-[300px] rounded-2xl shrink-0 shadow-md overflow-hidden">
        <CoverImage :src="getCoverUrl(albumInfo.platforms, '200px')" />
      </div>
      <div class="flex flex-col justify-between ml-8">
        <div>
          <div class="text-3xl font-bold">
            {{ musicInfo.name }}
            <!-- <span class="ml-2 text-xl text-gray-500">
              {{ musicInfo.netease.alias ?? '' }}
            </span> -->
          </div>

          <div class="mt-2 flex items-center gap-2">
            <!-- <span class="text-gray-500">所属</span>
            <RouterLink
              :to="{ name: 'ProductInfo', params: { name: albumInfo.product } }"
              class="flex items-center hover:bg-gray-500/20 p-1 rounded-lg transition-colors"
              :title="getProductName(albumInfo.product)"
            >
              <img class="size-6" :src="getProductIconUrl(albumInfo.product, '48px')">
            </RouterLink> -->
            <span class="text-gray-500">收录于</span>
            <RouterLink
              :to="{ name: 'AlbumInfo', params: { id: albumInfo.id } }"
              class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              <span>{{ albumInfo.name }}</span>
            </RouterLink>
          </div>
          <div class="mt-2 flex items-center">
            <span class="text-gray-500">发布于</span>
            <span class="ml-2">
              {{ albumInfo.publishDate }}
            </span>
          </div>
        </div>
        <div class="flex gap-2">
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
          <Dropdown :options="neteaseOptions">
            <button
              class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            >
              <IconNcm class="size-5 text-[#fc3b5b]" />
            </button>
          </Dropdown>
          <button
            class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            @click="goFeedbackPage"
          >
            反馈问题
          </button>
        </div>
      </div>
    </div>

    <div class="flex gap-4 mt-4">
      <!-- <div class="w-[400px] p-4 bg-black/5 rounded-xl">
        <ArtistListByType :albums="[albumInfo]" :music-id="musicId" />
      </div> -->

      <div class="flex-1">
        <div class="bg-black/5 rounded-xl overflow-hidden p-4">
          <div v-for="line, index in lyricList" :key="index">
            {{ line }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

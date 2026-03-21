<script setup lang="ts">
import type { ExportAlbum, ExportSong } from '@/types/export'
import { getAlbumInfoApi } from '@/api'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'
import {
  buildPlaylistFromAlbum,
  buildPlaylistItem,
  formatDuration,
  getCoverUrl,
  getProductIconUrl,
  goNeteaseClient,
} from '@/utils'

const route = useRoute()
const store = useStore()
const playerStore = usePlayerStore()

const albumId = computed(() => route.params.id as string)

const albumInfo = ref<ExportAlbum | null>(null)

const discList = computed(() => {
  if (albumInfo.value) {
    return albumInfo.value.songs.reduce((disks, song) => {
      const disk = disks.find(d => d.name === song.disc)
      if (disk) {
        disk.songs.push(song)
      }
      else {
        disks.push({
          name: song.disc,
          songs: [song],
        })
      }
      return disks
    }, [] as { name: string, songs: ExportAlbum['songs'] }[])
  }
  return []
})

const showDiscName = computed(() => {
  return discList.value.length > 1
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

watch(albumInfo, (val) => {
  if (val) {
    document.title = `${val.name} - HOYO-MiX Online`
    store.setBackground(getCoverUrl(val.platforms, '200px'))
  }
}, { immediate: true })

const neteaseOptions = computed(() => [
  {
    label: '跳转至详情页',
    onClick: () => {
      window.open(`https://music.163.com/#/album?id=${albumInfo.value!.platforms.ncm!.id}`)
    },
  },
  {
    label: '在 APP 中播放',
    onClick: () => {
      goNeteaseClient({
        type: 'album',
        id: albumInfo.value!.platforms.ncm!.id,
        cmd: 'play',
      })
    },
  },
])

const qqMusicOptions = computed(() => [
  {
    label: '跳转至详情页',
    onClick: () => {
      window.open(`https://y.qq.com/n/ryqq_v2/albumDetail/${albumInfo.value!.platforms.qq!.id}`)
    },
  },
])

function playAll() {
  if (!albumInfo.value)
    return
  playerStore.replacePlaylist(buildPlaylistFromAlbum(albumInfo.value), 0)
}

function playSong(song: ExportSong) {
  if (!albumInfo.value)
    return
  const items = buildPlaylistFromAlbum(albumInfo.value)
  const index = items.findIndex(i => i.songId === song.id)
  playerStore.replacePlaylist(items, Math.max(0, index))
}

function addToPlaylist(song: ExportSong) {
  if (!albumInfo.value)
    return
  playerStore.addToPlaylist(buildPlaylistItem(song, albumInfo.value))
}

const activeTab = ref<'songs' | 'artists'>('songs')

onMounted(() => {
  document.documentElement.scrollTo(0, 0)
})
</script>

<template>
  <div v-if="albumInfo" class="overflow-hidden">
    <div class="flex flex-col md:flex-row md:h-[300px]">
      <div class="w-full md:w-[300px] rounded-2xl shrink-0 shadow-md overflow-hidden">
        <CoverImage :src="getCoverUrl(albumInfo.platforms)" />
      </div>

      <div class="flex flex-col justify-between mt-4 md:mt-0 md:ml-8">
        <div>
          <div class="text-2xl md:text-3xl font-bold">
            {{ albumInfo.name }}
          </div>
          <div class="mt-2 flex items-center flex-wrap">
            <RouterLink
              :to="{ name: 'ProductInfo', params: { name: albumInfo.productName } }"
              class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              <img class="size-8" :src="getProductIconUrl(albumInfo.productName, '48px')">
              <span class="ml-2">
                {{ albumInfo.productName }}
              </span>
            </RouterLink>
            <span class="text-gray-500 ml-2">发布于</span>
            <span class="ml-2">
              {{ albumInfo.publishDate }}
            </span>
          </div>
          <OverlayScrollbarsComponent class="mt-2 h-[80px]" :options="{ scrollbars: { theme: 'os-theme-custom', autoHide: 'leave', clickScroll: true } }" defer>
            {{ albumInfo.description }}
          </OverlayScrollbarsComponent>
        </div>
        <div class="flex gap-2 mt-4 md:mt-0 flex-wrap">
          <button
            class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
            @click="playAll"
          >
            <LucidePlay class="size-4" fill="currentColor" />
            播放全部
          </button>
          <Dropdown v-if="albumInfo.platforms.ncm" :options="neteaseOptions">
            <button
              class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            >
              <IconNcm class="size-5 text-[#fc3b5b]" />
            </button>
          </Dropdown>
          <Dropdown v-if="albumInfo.platforms.qq" :options="qqMusicOptions">
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
        :class="activeTab === 'songs' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="activeTab = 'songs'"
      >
        歌曲列表
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
      <div v-show="activeTab === 'artists'" class="w-full md:w-[400px] p-4 bg-black/5 rounded-xl md:!block" :class="{ hidden: activeTab !== 'artists' }">
        <ArtistListByType :id="albumInfo.id" type="album" />
      </div>

      <div v-show="activeTab === 'songs'" class="flex-1 md:!block" :class="{ hidden: activeTab !== 'songs' }">
        <div class="bg-black/5 rounded-xl overflow-hidden pt-2 pb-4">
          <table class="w-full">
            <thead>
              <tr class="text-left">
                <th class="pl-4 p-2 w-[30px]">
                  #
                </th>
                <th class="p-2">
                  歌曲
                </th>
                <th class="hidden md:table-cell p-2 w-[100px]">
                  时长
                </th>
                <th class="hidden md:table-cell p-2 w-[80px]" />
              </tr>
            </thead>
            <tbody v-if="albumInfo">
              <template v-for="discInfo, index in discList" :key="index">
                <tr v-if="showDiscName">
                  <td colspan="3">
                    <div class="text-gray-600 py-2 px-3 text-sm">
                      {{ discInfo.name }}
                    </div>
                  </td>
                </tr>
                <tr
                  v-for="songInfo, songIndex in discInfo.songs" :key="songInfo.id"
                  class="hover:bg-black/8 cursor-pointer transition-colors group"
                  @click="$router.push({ name: 'MusicInfo', params: { albumId: albumInfo.id, musicId: songInfo.id } })"
                >
                  <td class="pl-4 p-2 text-gray-500">
                    {{ songIndex + 1 }}
                  </td>
                  <td class="p-2">
                    <div>
                      {{ songInfo.name }}
                      <span
                        v-if="songInfo.description"
                        class="text-sm text-gray-500 ml-2"
                      >
                        {{ songInfo.description }}
                      </span>
                    </div>
                  </td>
                  <td class="hidden md:table-cell p-2">
                    {{ formatDuration(songInfo.duration) }}
                  </td>
                  <td class="hidden md:table-cell p-2">
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        class="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                        title="播放"
                        @click.stop="playSong(songInfo)"
                      >
                        <LucidePlay class="size-4" />
                      </button>
                      <button
                        class="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                        title="添加到播放列表"
                        @click.stop="addToPlaylist(songInfo)"
                      >
                        <LucidePlus class="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

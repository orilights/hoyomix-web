<script setup lang="ts">
import type { ExportAlbum } from '@/types/export'
import { getAlbumInfoApi } from '@/api'
import { useStore } from '@/store'
import {
  formatDuration,
  getCoverUrl,
  goFeedbackPage,
  goNeteaseClient,
} from '@/utils'

const route = useRoute()
const store = useStore()

const albumId = computed(() => route.params.id as string)

const albumInfo = ref<ExportAlbum | null>(null)

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

// function goPrevAlbum() {
//   const index = albums.value.findIndex(album => album.netease.id === Number(albumId.value))
//   if (index > 0) {
//     router.push({ name: 'AlbumInfo', params: { id: albums.value[index - 1].netease.id } })
//   }
// }

// function goNextAlbum() {
//   const index = albums.value.findIndex(album => album.netease.id === Number(albumId.value))
//   if (index < albums.value.length - 1) {
//     router.push({ name: 'AlbumInfo', params: { id: albums.value[index + 1].netease.id } })
//   }
// }

onMounted(() => {
  document.documentElement.scrollTo(0, 0)
})
</script>

<template>
  <div v-if="albumInfo" class="overflow-hidden">
    <div class="h-[300px] flex">
      <div class="w-[300px] rounded-2xl shrink-0 shadow-md overflow-hidden">
        <CoverImage :src="getCoverUrl(albumInfo.platforms, '200px')" />
      </div>

      <div class="flex flex-col justify-between ml-8">
        <div>
          <div class="text-3xl font-bold">
            {{ albumInfo.name }}
          </div>
          <div class="mt-2 flex items-center">
            <!-- <RouterLink
              :to="{ name: 'ProductInfo', params: { name: albumInfo.product } }"
              class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              <img class="size-8" :src="getProductIconUrl(album_info.product, '48px')">
              <span class="ml-2">
                {{ getProductName(album_info.product) }}
              </span>
            </RouterLink> -->
            <span class="text-gray-500 ml-2">发布于</span>
            <span class="ml-2">
              {{ albumInfo.publishDate }}
            </span>
          </div>
          <div class="mt-2 h-[160px] overflow-y-auto">
            {{ albumInfo.description }}
          </div>
        </div>
        <div class="flex gap-2">
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
        <ArtistListByType :albums="[album_info]" />
      </div> -->

      <div class="flex-1">
        <div class="bg-black/5 rounded-xl overflow-hidden pt-2 pb-4">
          <table class="w-full ">
            <thead>
              <tr class="text-left">
                <th class="pl-4 p-2 w-[30px]">
                  #
                </th>
                <th class="p-2">
                  歌曲
                </th>
                <!-- <th class="p-2 w-[100px]">
                  类型
                </th> -->
                <th class="p-2 w-[100px]">
                  时长
                </th>
              </tr>
            </thead>
            <tbody v-if="albumInfo">
              <tr
                v-for="music_info, index in albumInfo.songs" :key="music_info.id"
                class="hover:bg-black/8 cursor-pointer transition-colors"
                @click="$router.push({ name: 'MusicInfo', params: { albumId: albumInfo.id, musicId: music_info.id } })"
              >
                <td class="pl-4 p-2 text-gray-500">
                  {{ index + 1 }}
                </td>
                <td class="p-2">
                  <div>
                    {{ music_info.name }}
                    <!-- <span
                      v-if="music_info.netease.alias"
                      class="text-sm text-gray-500 ml-2"
                    >
                      {{ music_info.netease.alias }}
                    </span> -->
                  </div>
                </td>
                <!-- <td class="p-2">
                  {{ music_info.type === MusicType.PURE_MUSIC ? '纯音乐' : '歌曲' }}
                </td> -->
                <td class="p-2">
                  {{ formatDuration(music_info.duration) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

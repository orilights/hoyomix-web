<script setup lang="ts">
import ArtistListByType from '@/components/ArtistListByType.vue'
import { useStore } from '@/store'
import { MusicType } from '@/types/core'
import {
  formatDuration,
  getCoverUrl,
  getProductIconUrl,
  getProductName,
  getPublishDate,
  goFeedbackPage,
  goNeteaseClient,
} from '@/utils'

const route = useRoute()
const store = useStore()
const { albums } = toRefs(store)

const albumId = computed(() => route.params.id as string)
const album_info = computed(() => albums.value.find(album => album.netease.id === Number(albumId.value)))

function goToNetease() {
  window.open(`https://music.163.com/#/album?id=${album_info.value!.netease.id}`)
}

function goToNeteaseClient() {
  goNeteaseClient({
    type: 'album',
    id: album_info.value!.netease.id,
    cmd: 'play',
  })
}

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

watch(album_info, (val) => {
  if (val) {
    document.title = `${val.name} - HOYO-MiX Online`
    store.setBackground(getCoverUrl('netease', val.netease.coverPicId, '200px'))
  }
}, { immediate: true })

onMounted(() => {
  document.documentElement.scrollTo(0, 0)
})
</script>

<template>
  <div v-if="album_info" class="overflow-hidden">
    <div class="h-[300px] flex">
      <img
        class="size-[300px] rounded-2xl shrink-0 shadow-md"
        :src="getCoverUrl('netease', album_info.netease.coverPicId)"
        :alt="album_info.name"
      >
      <div class="flex flex-col justify-between ml-8">
        <div>
          <div class="text-3xl font-bold">
            {{ album_info.name }}
          </div>
          <div class="mt-2 flex items-center">
            <RouterLink
              :to="{ name: 'ProductInfo', params: { name: album_info.product } }"
              class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              <img class="size-8" :src="getProductIconUrl(album_info.product, '48px')">
              <span class="ml-2">
                {{ getProductName(album_info.product) }}
              </span>
            </RouterLink>
            <span class="text-gray-500 ml-2">发布于</span>
            <span class="ml-2">
              {{ getPublishDate(album_info.publishTime) }}
            </span>
          </div>
          <div class="mt-2 h-[160px] overflow-y-auto">
            {{ album_info.netease.description }}
          </div>
        </div>
        <div>
          <button
            class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            @click="goToNetease"
          >
            跳转至网易云音乐
          </button>
          <button
            class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer ml-2"
            @click="goToNeteaseClient"
          >
            在网易云音乐 App 中播放
          </button>
          <button
            class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer ml-2"
            @click="goFeedbackPage"
          >
            反馈问题
          </button>
        </div>
      </div>
    </div>

    <div class="flex gap-4 mt-4">
      <div class="w-[400px] p-4 bg-black/5 rounded-xl">
        <ArtistListByType :albums="[album_info]" />
      </div>

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
                <th class="p-2 w-[100px]">
                  类型
                </th>
                <th class="p-2 w-[100px]">
                  时长
                </th>
              </tr>
            </thead>
            <tbody v-if="album_info">
              <tr
                v-for="music_info, index in album_info.musics" :key="music_info.netease.id"
                class="hover:bg-black/8 cursor-pointer transition-colors"
                @click="$router.push({ name: 'MusicInfo', params: { id: music_info.netease.id } })"
              >
                <td class="pl-4 p-2 text-gray-500">
                  {{ index + 1 }}
                </td>
                <td class="p-2">
                  <div>
                    {{ music_info.name }}
                    <span
                      v-if="music_info.netease.alias"
                      class="text-sm text-gray-500 ml-2"
                    >
                      {{ music_info.netease.alias }}
                    </span>
                  </div>
                </td>
                <td class="p-2">
                  {{ music_info.type === MusicType.PURE_MUSIC ? '纯音乐' : '歌曲' }}
                </td>
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

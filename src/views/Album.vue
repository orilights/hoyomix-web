<script setup lang="ts">
import type { SongListItemInfo } from '@/types/core'
import { toast } from 'vue-sonner'
import { NotFoundError } from '@/api/music'
import { useAlbumInfoQuery } from '@/composables/queries'
import { appTitle } from '@/constants'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
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
const router = useRouter()
const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()

const albumId = computed(() => Number(route.params.id as string) || null)

const { data: albumInfo, isLoading, isError, error } = useAlbumInfoQuery(albumId)

watch(isError, (val) => {
  if (!val)
    return
  if (error.value instanceof NotFoundError)
    router.replace({ path: '/404', query: { errorMessage: error.value?.message } })
  else
    toast.error(`专辑信息加载失败：${error.value?.message ?? '未知错误'}`)
})

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
    }, [] as { name: string, songs: typeof albumInfo.value.songs }[])
  }
  return []
})

const showDiscName = computed(() => {
  return discList.value.length > 1
})

watch(albumInfo, (val) => {
  if (val) {
    document.title = `${val.name} - ${appTitle}`
    store.setBackground(getCoverUrl(val.platforms, '128px'))
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
  player.replacePlaylist(buildPlaylistFromAlbum(albumInfo.value), 0)
  toast.success('已替换播放列表')
}

function playSong(song: SongListItemInfo) {
  if (!albumInfo.value)
    return
  const { index } = player.addToPlaylist(buildPlaylistItem(song, albumInfo.value!))
  player.playSong(index)
  toast.success('已添加至播放列表并播放')
}

function addToPlaylist(song: SongListItemInfo) {
  if (!albumInfo.value)
    return
  const { isNew } = player.addToPlaylist(buildPlaylistItem(song, albumInfo.value))
  toast.success(isNew ? '已添加至播放列表' : '歌曲已在播放列表中')
}

const activeTab = ref<'songs' | 'artists' | 'tags'>('songs')

const showCreatePlaylistDialog = ref(false)
const showSelectPlaylistDialog = ref(false)

const allSongIds = computed(() => albumInfo.value?.songs.map(s => s.id) ?? [])

function saveAsPlaylist() {
  if (!auth.requireLogin())
    return
  showCreatePlaylistDialog.value = true
}

function addAlbumToPlaylist() {
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

  <div v-else-if="isError" class="flex items-center justify-center py-20 text-red-400">
    加载失败，请刷新重试
  </div>

  <div v-else-if="albumInfo">
    <div class="flex md:h-[200px] lg:h-[300px]">
      <div class="size-[100px] md:size-[200px] lg:size-[300px] rounded-2xl shrink-0 shadow-md overflow-hidden">
        <CoverImage :src="getCoverUrl(albumInfo.platforms, '800px')" />
      </div>

      <div class="flex flex-col ml-4 md:ml-8 overflow-hidden">
        <div class="md:text-xl lg:text-3xl font-bold truncate" :title="albumInfo.name">
          {{ albumInfo.name }}
        </div>

        <div class="mt-1 md:mt-2 flex items-center gap-x-2 flex-wrap text-sm md:text-base">
          <RouterLink
            :to="{ name: 'ProductInfo', params: { name: albumInfo.productName } }"
            class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
          >
            <img class="size-5 md:size-8" :src="getProductIconUrl(albumInfo.productName, '48px')">
            <span class="ml-2 hidden md:inline">
              {{ albumInfo.productName }}
            </span>
          </RouterLink>
          <span class="text-gray-500 hidden md:inline">发布于</span>
          <span>
            {{ albumInfo.publishDate }}
          </span>
          <span class="text-gray-500 hidden md:inline">时长</span>
          <span>
            {{ formatDuration(albumInfo.totalDuration) }}
          </span>
        </div>

        <OverlayScrollbarsComponent
          class="mt-1 md:mt-2 flex-1 text-xs md:text-sm lg:text-base"
          :options="{ scrollbars: { theme: 'os-theme-custom', autoHide: 'leave', clickScroll: true } }"
          defer
        >
          {{ albumInfo.description }}
        </OverlayScrollbarsComponent>

        <div class="hidden md:flex gap-2 pt-2 mt-auto flex-wrap shrink-0">
          <AlbumActions
            dropdown-position="up"
            :ncm-options="albumInfo.platforms.ncm ? neteaseOptions : undefined"
            :qq-options="albumInfo.platforms.qq ? qqMusicOptions : undefined"
            @play-all="playAll"
            @save-as-playlist="saveAsPlaylist"
            @add-to-playlist="addAlbumToPlaylist"
          />
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-wrap md:hidden mt-4">
      <AlbumActions
        :ncm-options="albumInfo.platforms.ncm ? neteaseOptions : undefined"
        :qq-options="albumInfo.platforms.qq ? qqMusicOptions : undefined"
        @play-all="playAll"
        @save-as-playlist="saveAsPlaylist"
        @add-to-playlist="addAlbumToPlaylist"
      />
    </div>

    <div class="flex gap-2 mt-4 lg:hidden">
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
      <button
        class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        :class="activeTab === 'tags' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="activeTab = 'tags'"
      >
        其他信息
      </button>
    </div>

    <div class="flex flex-col lg:flex-row lg:gap-4 mt-4">
      <div class="w-full lg:w-[400px]">
        <div v-show="activeTab === 'tags'" class="w-full lg:w-[400px] lg:!block h-fit lg:mb-4" :class="{ hidden: activeTab !== 'tags' }">
          <TagList :tags="albumInfo.tags" />
        </div>

        <div v-show="activeTab === 'artists'" class="w-full lg:w-[400px] p-4 bg-black/5 rounded-xl lg:!block h-fit" :class="{ hidden: activeTab !== 'artists' }">
          <ArtistListByType :id="albumInfo.id" type="album" />
        </div>
      </div>

      <div v-show="activeTab === 'songs'" class="flex-1 lg:!block h-fit" :class="{ hidden: activeTab !== 'songs' }">
        <div class="bg-black/5 rounded-xl pt-2 pb-4">
          <table class="w-full table-fixed overflow-hidden">
            <thead>
              <tr class="text-left">
                <th class="pl-4 p-2 w-[40px]">
                  #
                </th>
                <th class="p-2">
                  歌曲
                </th>
                <th class="p-2 w-[100px]">
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
                    <p class="truncate" :title="songInfo.name">
                      {{ songInfo.name }}
                    </p>
                    <p v-if="songInfo.description" class="truncate text-xs text-gray-500">
                      {{ songInfo.description }}
                    </p>
                  </td>
                  <td class="p-2">
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

    <CreatePlaylistDialog
      v-if="albumInfo"
      v-model="showCreatePlaylistDialog"
      :initial-song-ids="allSongIds"
      :initial-cover-album-id="albumInfo.id"
      @success="(id) => $router.push({ name: 'PlaylistDetail', params: { id } })"
    />

    <SelectPlaylistDialog
      v-model="showSelectPlaylistDialog"
      :song-ids="allSongIds"
      mode="add"
    />
  </div>
</template>

<style scoped>
</style>

<script setup lang="ts">
import type { SongListGroup } from '@/types/song-list'
import { toast } from 'vue-sonner'
import { useAlbumInfoQuery, useCommentThreadsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
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
import { NotFoundError } from '@/utils/fetch'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()

const albumId = computed(() => Number(route.params.id as string) || null)

const { data: albumInfo, isLoading, isError, error } = useAlbumInfoQuery(albumId)
const commentPostId = computed(() => albumInfo.value ? `hoyomix:album:${albumInfo.value.id}` : null)
const commentUserId = computed(() => auth.user?.id ?? null)
const commentPage = ref(1)
const { data: commentThreads } = useCommentThreadsQuery(commentPostId, commentUserId, commentPage)
const commentCount = computed(() => commentThreads.value?.commentCount ?? commentThreads.value?.pagination.total ?? 0)
const commentSection = ref<HTMLElement | null>(null)

function scrollToComments() {
  commentSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

const songListItems = computed(() => albumInfo.value ? buildPlaylistFromAlbum(albumInfo.value) : [])

const songGroups = computed<SongListGroup[]>(() => {
  if (!albumInfo.value || !showDiscName.value)
    return []

  return discList.value.map((disc, index) => ({
    key: `${index}-${disc.name}`,
    label: disc.name,
    songs: disc.songs.map(song => buildPlaylistItem(song, albumInfo.value!)),
  }))
})

const albumCoverUrl = computed(() =>
  albumInfo.value ? getCoverUrl(albumInfo.value.platforms, '512px') : '',
)

usePageSeo({
  title: computed(() => albumInfo.value?.name ?? null),
  description: computed(() => albumInfo.value?.description || null),
  path: computed(() => (albumId.value ? `/album/${albumId.value}` : null)),
  image: albumCoverUrl,
})

watch(albumInfo, (val) => {
  if (val) {
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

const activeTab = ref<'songs' | 'artists' | 'tags' | 'comments'>('songs')

watch([commentPostId, () => route.query.commentPostId], ([postId, targetPostId]) => {
  if (postId && targetPostId === postId)
    activeTab.value = 'comments'
}, { immediate: true })

watch(albumId, () => {
  activeTab.value = 'songs'
})

const showCreatePlaylistDialog = ref(false)
const showSelectPlaylistDialog = ref(false)

const allSongIds = computed(() => albumInfo.value?.songs.map(s => s.id) ?? [])

registerSongList({
  songIds: allSongIds,
  // 定位前确保歌曲 Tab 可见
  onBeforeLocate: () => {
    activeTab.value = 'songs'
  },
})

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
  <AsyncFade>
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
              <LazyImg class="size-5 md:size-8 rounded-full" :src="getProductIconUrl(albumInfo.productName, '48px')" />
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
              :ncm-options="albumInfo.platforms.ncm ? neteaseOptions : undefined"
              :qq-options="albumInfo.platforms.qq ? qqMusicOptions : undefined"
              @play-all="playAll"
              @save-as-playlist="saveAsPlaylist"
              @add-to-playlist="addAlbumToPlaylist"
            />
            <div class="hidden lg:block">
              <AppButton @click="scrollToComments">
                <LucideMessageCircle class="size-4" />
                评论 {{ commentCount }}
              </AppButton>
            </div>
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

      <div class="flex flex-wrap gap-2 mt-4 lg:hidden">
        <button
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'songs' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'songs'"
        >
          歌曲列表
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'artists' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'artists'"
        >
          制作人员
        </button>
        <button
          v-if="albumInfo.tags.length"
          class="text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="activeTab === 'tags' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
          @click="activeTab = 'tags'"
        >
          其他信息
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
          <div v-if="albumInfo.tags.length" v-show="activeTab === 'tags'" class="w-full lg:w-[400px] lg:!block h-fit lg:mb-4" :class="{ hidden: activeTab !== 'tags' }">
            <TagList :tags="albumInfo.tags" :album-id="albumInfo.id" />
          </div>

          <div v-show="activeTab === 'artists'" class="w-full lg:w-[400px] p-4 bg-black/5 rounded-xl lg:!block h-fit" :class="{ hidden: activeTab !== 'artists' }">
            <ArtistListByType :id="albumInfo.id" type="album" />
          </div>
        </div>

        <div v-show="activeTab === 'songs'" class="flex-1 lg:!block h-fit" :class="{ hidden: activeTab !== 'songs' }">
          <SongList :songs="songListItems" :groups="songGroups" />
        </div>
      </div>

      <div v-show="activeTab === 'comments'" ref="commentSection" class="lg:!block">
        <CommentSection :post-id="`hoyomix:album:${albumInfo.id}`" />
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
  </AsyncFade>
</template>

<style scoped>
</style>

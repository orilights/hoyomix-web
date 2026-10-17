<script setup lang="ts">
import type { SongListGroup } from '@/types/song-list'
import { toast } from 'vue-sonner'
import { useAlbumInfoQuery, useCommentThreadsQuery } from '@/composables/queries'
import { scrollPageToElement } from '@/composables/usePageScroll'
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
const activeTab = ref<'songs' | 'artists' | 'info' | 'comments'>('songs')
const descriptionExpanded = ref(false)

async function scrollToComments() {
  activeTab.value = 'comments'
  await nextTick()
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

const tabOptions = computed(() => [
  { key: 'songs' as const, label: '曲目' },
  { key: 'artists' as const, label: '制作人员' },
  { key: 'info' as const, label: '专辑信息' },
  { key: 'comments' as const, label: `评论 ${commentCount.value}` },
])

const songSection = ref<HTMLElement | null>(null)

async function scrollToDisc(index: number) {
  const firstSong = discList.value[index]?.songs[0]
  if (!firstSong)
    return
  activeTab.value = 'songs'
  await nextTick()
  const row = songSection.value?.querySelector(`[data-song-id="${firstSong.id}"]`)
  const target = row?.previousElementSibling ?? row
  if (target) {
    if (!scrollPageToElement(target, 32, 'smooth'))
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch([commentPostId, () => route.query.commentPostId], ([postId, targetPostId]) => {
  if (postId && targetPostId === postId)
    activeTab.value = 'comments'
}, { immediate: true })

watch(albumId, () => {
  activeTab.value = 'songs'
  descriptionExpanded.value = false
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

    <div v-else-if="albumInfo" class="album-page detail-page">
      <div class="detail-header">
        <div class="detail-cover rounded-2xl shrink-0 shadow-md overflow-hidden">
          <CoverImage :src="getCoverUrl(albumInfo.platforms, '256px')" />
        </div>

        <div class="min-w-0">
          <div class="detail-title font-bold break-words" :title="albumInfo.name">
            {{ albumInfo.name }}
          </div>

          <div class="detail-meta mt-1 flex items-center flex-wrap text-sm">
            <RouterLink
              :to="{ name: 'ProductInfo', params: { name: albumInfo.productName } }"
              class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              <LazyImg class="size-5 rounded-full" :src="getProductIconUrl(albumInfo.productName, '48px')" />
              <span class="ml-2">
                {{ albumInfo.productName }}
              </span>
            </RouterLink>
            <span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400" aria-label="发布日期">
              <LucideCalendarDays class="size-4 shrink-0" aria-hidden="true" />
              {{ albumInfo.publishDate }}
            </span>
            <span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400" aria-label="歌曲数量">
              <LucideMusic class="size-4 shrink-0" aria-hidden="true" />
              {{ albumInfo.songs.length }}
            </span>
            <span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400" aria-label="总时长">
              <LucideClock class="size-4 shrink-0" aria-hidden="true" />
              {{ formatDuration(albumInfo.totalDuration) }}
            </span>
          </div>
        </div>

        <div class="detail-actions">
          <AlbumActions
            :ncm-options="albumInfo.platforms.ncm ? neteaseOptions : undefined"
            :qq-options="albumInfo.platforms.qq ? qqMusicOptions : undefined"
            :comment-count="commentCount"
            @play-all="playAll"
            @save-as-playlist="saveAsPlaylist"
            @add-to-playlist="addAlbumToPlaylist"
            @show-comments="scrollToComments"
          />
        </div>
      </div>

      <div class="detail-tabs">
        <SegmentSwitch v-model="activeTab" :options="tabOptions" block aria-label="专辑内容" />
      </div>

      <div class="detail-content">
        <div v-show="activeTab === 'songs' || activeTab === 'comments'" class="detail-desktop-visible min-w-0">
          <div v-show="activeTab === 'songs'" ref="songSection" class="detail-desktop-visible">
            <nav
              v-if="showDiscName"
              class="mb-3 w-fit max-w-full"
              aria-label="分碟导航"
            >
              <div class="flex gap-2 overflow-x-auto">
                <AppButton
                  v-for="(disc, index) in discList"
                  :key="disc.name"
                  class="shrink-0"
                  :title="disc.name"
                  :aria-label="`定位到 ${disc.name}，共 ${disc.songs.length} 首`"
                  @click="scrollToDisc(index)"
                >
                  {{ disc.name }}
                  <span class="text-gray-500 dark:text-gray-400">{{ disc.songs.length }}</span>
                </AppButton>
              </div>
            </nav>
            <SongList :songs="songListItems" :groups="songGroups" />
          </div>

          <div v-show="activeTab === 'comments'" ref="commentSection" class="detail-comments detail-desktop-visible">
            <CommentSection :post-id="`hoyomix:album:${albumInfo.id}`" />
          </div>
        </div>

        <div v-show="activeTab === 'artists' || activeTab === 'info'" class="detail-sidebar detail-sidebar-stack detail-desktop-visible min-w-0">
          <div v-show="activeTab === 'info'" class="detail-desktop-visible">
            <div v-if="albumInfo.description" class="album-description text-sm bg-black/5 dark:bg-white/5 rounded-xl p-4">
              <p
                id="album-description-content"
                class="whitespace-pre-wrap break-words"
                :class="{ 'detail-description-collapsed': !descriptionExpanded }"
              >
                {{ albumInfo.description }}
              </p>
              <button
                type="button"
                class="mt-2 text-blue-500 hover:text-blue-600 cursor-pointer"
                :aria-expanded="descriptionExpanded"
                aria-controls="album-description-content"
                @click="descriptionExpanded = !descriptionExpanded"
              >
                {{ descriptionExpanded ? '收起介绍' : '展开介绍' }}
              </button>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              暂无简介
            </p>
            <div v-if="albumInfo.tags.length" class="mt-4">
              <TagList :tags="albumInfo.tags" :album-id="albumInfo.id" />
            </div>
          </div>

          <div v-show="activeTab === 'artists'" class="detail-desktop-visible">
            <ArtistListByType :id="albumInfo.id" type="album" />
          </div>

          <div v-show="activeTab === 'info'" class="detail-desktop-visible">
            <ContributionCard :id="albumInfo.id" type="album" />
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
  </AsyncFade>
</template>

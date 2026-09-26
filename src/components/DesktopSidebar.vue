<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { ChartNoAxesCombined, Disc3, House, ListMusic, Shuffle, TrendingUp } from '@lucide/vue'
import { useFavoritePlaylistsQuery, useMyPlaylistsQuery } from '@/composables/queries'
import { productMap } from '@/constants'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl, getProductIconUrl } from '@/utils'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = useMainStore()
const player = usePlayerStore()
const showCreate = ref(false)
const mine = useMyPlaylistsQuery()
const favorites = useFavoritePlaylistsQuery()

const navigation = [
  { name: 'Home', label: '首页', icon: House },
  { name: 'Albums', label: '全部专辑', icon: Disc3 },
  { name: 'Playlists', label: '歌单广场', icon: ListMusic },
  { name: 'Random', label: '随机播放列表', icon: Shuffle },
  { name: 'Ranking', label: '热榜', icon: TrendingUp },
  { name: 'Statistics', label: '统计', icon: ChartNoAxesCombined },
]

const likedSongs = computed(() => mine.data.value?.find(item => item.type === 'favorites'))
const groups = computed(() => [
  {
    tab: 'mine',
    title: '创建的歌单',
    items: mine.data.value?.filter(item => item.type !== 'favorites') ?? [],
    loading: mine.isPending.value,
    error: mine.isError.value,
    retry: () => mine.refetch(),
  },
  {
    tab: 'favorites',
    title: '收藏的歌单',
    items: favorites.data.value ?? [],
    loading: favorites.isPending.value,
    error: favorites.isError.value,
    retry: () => favorites.refetch(),
  },
])

const covers = computed(() => new Map(store.albumList.map(album => [album.id, getCoverUrl(album.platforms, '96px')])))
function coverUrl(playlist: PlaylistListItem) {
  return playlist.coverAlbumId ? covers.value.get(playlist.coverAlbumId) ?? '' : ''
}

function isNavigationActive(name: string) {
  return route.name === name && (name !== 'Playlists' || !['mine', 'favorites'].includes(String(route.query.tab)))
}

function isPlaylistActive(id: string) {
  return (route.name === 'PlaylistDetail' && route.params.id === id)
    || (route.name === 'PlaylistMusicInfo' && route.params.playlistId === id)
}

function openCreate() {
  if (auth.requireLogin())
    showCreate.value = true
}

function onCreated(id: string) {
  void router.push({ name: 'PlaylistDetail', params: { id } })
}

watch(() => auth.user?.id, () => {
  showCreate.value = false
})
</script>

<template>
  <aside
    v-show="!player.isFullscreen"
    aria-label="桌面导航"
    class="fixed left-0 top-0 bottom-[72px] z-10 w-[240px] flex flex-col bg-slate-50/80 backdrop-blur-2xl border-r border-gray-200/60"
  >
    <RouterLink to="/" class="sidebar-brand flex items-center gap-3 shrink-0 px-6 h-[72px] text-gray-900 font-bold tracking-wide">
      <span class="flex items-center justify-center size-9 rounded-xl bg-blue-500/10 text-blue-500">
        <LucideAudioLines class="size-5" />
      </span>
      HOYO-MiX
    </RouterLink>

    <OverlayScrollbarsComponent
      defer
      class="flex-1 min-h-0"
      :options="{ overflow: { x: 'hidden', y: 'scroll' }, scrollbars: { theme: 'os-theme-custom', autoHide: 'leave' } }"
    >
      <div class="px-3 pb-4 space-y-5">
        <nav aria-label="发现">
          <div class="sidebar-heading">
            发现
          </div>
          <RouterLink
            v-for="item in navigation" :key="item.name"
            :to="{ name: item.name }"
            class="sidebar-link"
            :class="{ 'is-active': isNavigationActive(item.name) }"
            :aria-current="isNavigationActive(item.name) ? 'page' : undefined"
          >
            <component :is="item.icon" class="size-4.5 shrink-0" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <nav aria-label="游戏">
          <div class="sidebar-heading">
            游戏
          </div>
          <RouterLink
            v-for="(name, code) in productMap" :key="code"
            :to="{ name: 'ProductInfo', params: { name } }"
            class="sidebar-link"
            :class="{ 'is-active': route.name === 'ProductInfo' && route.params.name === name }"
            :aria-current="route.name === 'ProductInfo' && route.params.name === name ? 'page' : undefined"
          >
            <img :src="getProductIconUrl(name)" alt="" class="size-6 rounded-lg shrink-0">
            <span class="truncate">{{ name }}</span>
          </RouterLink>
        </nav>

        <div v-if="!auth.isLoggedIn" class="px-3 py-3 rounded-xl bg-black/5">
          <p class="text-xs text-gray-500 mb-3">
            登录后查看喜欢的音乐和歌单
          </p>
          <AppButton size="sm" class="w-full" @click="auth.openAuthDialog()">
            登录
          </AppButton>
        </div>
        <template v-else>
          <nav v-if="likedSongs" aria-label="我的音乐">
            <div class="sidebar-heading">
              我的音乐
            </div>
            <RouterLink
              :to="{ name: 'PlaylistDetail', params: { id: likedSongs.id } }"
              class="sidebar-link"
              :class="{ 'is-active': isPlaylistActive(likedSongs.id) }"
              :aria-current="isPlaylistActive(likedSongs.id) ? 'page' : undefined"
            >
              <LucideHeart class="size-4.5 shrink-0" />
              我喜欢的音乐
            </RouterLink>
          </nav>

          <nav v-for="group in groups" :key="group.tab" :aria-label="group.title">
            <div class="flex items-center justify-between px-3 mb-1">
              <RouterLink
                :to="{ name: 'Playlists', query: { tab: group.tab } }"
                class="sidebar-group-title text-xs text-gray-500 py-2 hover:text-blue-500"
                :class="{ 'text-blue-500': route.name === 'Playlists' && route.query.tab === group.tab }"
                :aria-current="route.name === 'Playlists' && route.query.tab === group.tab ? 'page' : undefined"
              >
                {{ group.title }}
              </RouterLink>
              <AppButton v-if="group.tab === 'mine'" icon-only size="sm" variant="ghost" aria-label="新建歌单" title="新建歌单" @click="openCreate">
                <LucidePlus class="size-4" />
              </AppButton>
            </div>
            <p v-if="group.loading" role="status" class="px-3 py-2 text-xs text-gray-400">
              加载中…
            </p>
            <div v-else-if="group.error" class="px-3 py-2 text-xs text-gray-500">
              加载失败
              <AppButton size="sm" variant="ghost" :aria-label="`重新加载${group.title}`" @click="group.retry()">
                重试
              </AppButton>
            </div>
            <p v-else-if="!group.items.length" class="px-3 py-2 text-xs text-gray-400">
              暂无歌单
            </p>
            <RouterLink
              v-for="playlist in group.items" :key="playlist.id"
              :to="{ name: 'PlaylistDetail', params: { id: playlist.id } }"
              :title="playlist.name"
              class="sidebar-link"
              :class="{ 'is-active': isPlaylistActive(playlist.id) }"
              :aria-current="isPlaylistActive(playlist.id) ? 'page' : undefined"
            >
              <span class="size-8 shrink-0 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
                <CoverImage v-if="coverUrl(playlist)" :key="coverUrl(playlist)" :src="coverUrl(playlist)" />
                <LucideMusic v-else class="size-4 text-gray-400" />
              </span>
              <span class="truncate">{{ playlist.name }}</span>
            </RouterLink>
          </nav>
        </template>
      </div>
    </OverlayScrollbarsComponent>

    <nav aria-label="应用" class="shrink-0 border-t border-gray-200/60 p-3 grid grid-cols-2 gap-1">
      <RouterLink :to="{ name: 'Settings' }" class="sidebar-link" :class="{ 'is-active': route.name === 'Settings' }" :aria-current="route.name === 'Settings' ? 'page' : undefined">
        <LucideSlidersHorizontal class="size-4 shrink-0" />设置
      </RouterLink>
      <RouterLink :to="{ name: 'Feedback' }" class="sidebar-link" :class="{ 'is-active': route.name === 'Feedback' }" :aria-current="route.name === 'Feedback' ? 'page' : undefined">
        <LucideMessageSquare class="size-4 shrink-0" />反馈
      </RouterLink>
    </nav>
  </aside>
  <CreatePlaylistDialog v-model="showCreate" @success="onCreated" />
</template>

<style scoped>
.sidebar-heading {
  padding: 0 12px 8px;
  font-size: 12px;
  color: var(--colors-gray-400, #9ca3af);
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 10px;
  color: var(--colors-gray-600, #4b5563);
  font-size: 14px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sidebar-link:hover {
  background: rgb(0 0 0 / 5%);
}

.sidebar-link.is-active {
  color: var(--colors-blue-600, #2563eb);
  background: rgb(59 130 246 / 10%);
  font-weight: 600;
}

.sidebar-link:focus-visible,
.sidebar-brand:focus-visible,
.sidebar-group-title:focus-visible {
  outline: 2px solid var(--colors-blue-500, #3b82f6);
  outline-offset: -2px;
}
</style>

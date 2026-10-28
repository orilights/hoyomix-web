<script setup lang="ts">
import type { OverlayScrollbars, PartialOptions } from 'overlayscrollbars'
import { useQueryClient } from '@tanstack/vue-query'
import { useEventListener, useIntervalFn, useMediaQuery } from '@vueuse/core'
import { toast, Toaster } from 'vue-sonner'
import { useAlbumFavoritesQuery, useAlbumListQuery, useAppConfigQuery } from '@/composables/queries'
import { completePageRender, setPageScrollElement, updatePageScroll } from '@/composables/usePageScroll'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { useMediaSourceStore } from '@/store/media-source'
import { usePlayerStore } from '@/store/player'
import { useThemeStore } from '@/store/theme'

const store = useMainStore()
const theme = useThemeStore()
const player = usePlayerStore()
const auth = useAuthStore()
const queryClient = useQueryClient()
const mediaSource = useMediaSourceStore()
const isDesktop = useMediaQuery('(min-width: 1280px)')
const { albumList, showSearch } = storeToRefs(store)
const { volume, isFullscreen, showPlaylist, isLoading } = storeToRefs(player)

const { pause: pauseSleepTimerClock, resume: resumeSleepTimerClock } = useIntervalFn(() => player.checkSleepTimer(), 500, { immediate: false })
watch(() => player.sleepTimer.status, (status) => {
  if (status === 'running')
    resumeSleepTimerClock()
  else
    pauseSleepTimerClock()
}, { immediate: true })
useEventListener(document, 'visibilitychange', () => player.checkSleepTimer())
useEventListener(window, ['focus', 'pageshow'], () => player.checkSleepTimer())

const {
  data: albumListData,
  isError: isAlbumListError,
  error: albumListError,
  isFetching: isAlbumListFetching,
  refetch: refetchAlbumList,
} = useAlbumListQuery()

const {
  data: appConfigData,
  isError: isAppConfigError,
  isFetching: isAppConfigFetching,
  refetch: refetchAppConfig,
} = useAppConfigQuery()

// 已有可用数据时，后台刷新不遮挡页面；首次加载须等待两项基础数据都就绪。
const initialDataReady = computed(() => albumListData.value !== undefined && appConfigData.value !== undefined)
const initialDataError = computed(() => (albumListData.value === undefined && isAlbumListError.value)
  || (appConfigData.value === undefined && isAppConfigError.value))
const canRetryInitialData = computed(() => (albumListData.value === undefined && !isAlbumListFetching.value)
  || (appConfigData.value === undefined && !isAppConfigFetching.value))

function retryInitialData() {
  if (albumListData.value === undefined && !isAlbumListFetching.value)
    void refetchAlbumList()
  if (appConfigData.value === undefined && !isAppConfigFetching.value)
    void refetchAppConfig()
}

// 登录、退出或切换账号时，统一清理身份相关缓存，再加载当前账号的收藏。
watch(() => auth.user?.id ?? null, (userId, previousUserId) => {
  store.clearFavorites()
  const queryKeys = [
    ['albumFavorites', previousUserId ?? null],
    ['commentThreads'],
    ['commentReplies'],
    ['editRequests'],
    ['editRequestDetail'],
  ]
  for (const queryKey of queryKeys) {
    void queryClient.cancelQueries({ queryKey })
    queryClient.removeQueries({ queryKey })
  }
  if (userId) {
    void store.fetchFavoriteSongs()
    void store.fetchFavoritePlaylists()
  }
}, { immediate: true, flush: 'sync' })

const { data: albumFavoritesData } = useAlbumFavoritesQuery()

watch(albumFavoritesData, (data) => {
  if (data && data.userId === auth.user?.id && !store.pendingAlbumFavorites.length)
    store.favoriteAlbumIds = [...data.albumIds]
}, { immediate: true })

watch(albumListData, (data) => {
  if (data)
    albumList.value = [...data].reverse()
}, { immediate: true })

watch(appConfigData, (data) => {
  if (!data)
    return
  store.setAppConfig(data)
  mediaSource.fetchAndConfigure(data.sources)
}, { immediate: true })

watch(isAlbumListError, (val) => {
  if (val && albumListData.value !== undefined)
    toast.error(`专辑列表加载失败：${albumListError.value?.message ?? '未知错误'}`)
})

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  // 表单、交互控件和对话框内不触发播放器快捷键
  if (e.defaultPrevented || target.closest('button, a, [role="dialog"]') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    return

  if (e.code === 'Space') {
    e.preventDefault()
    player.togglePlay()
  }
  else if (e.code === 'ArrowUp') {
    e.preventDefault()
    player.setVolume(volume.value + 0.05)
  }
  else if (e.code === 'ArrowDown') {
    e.preventDefault()
    player.setVolume(volume.value - 0.05)
  }
}

const pageScrollLocked = computed(() => isFullscreen.value || showPlaylist.value || showSearch.value)
const pageScrollOptions = computed<PartialOptions>(() => ({
  overflow: { x: 'hidden', y: pageScrollLocked.value ? 'hidden' : 'scroll' },
  scrollbars: { theme: 'os-theme-custom', autoHide: 'leave', clickScroll: true },
}))

function onPageScrollInitialized(instance: OverlayScrollbars) {
  setPageScrollElement(instance.elements().viewport)
}

function onPageScroll(_instance: OverlayScrollbars, event: Event) {
  updatePageScroll(event)
}

function onPageScrollDestroyed() {
  setPageScrollElement(null)
}

watch(() => mediaSource.selectedSource, () => {
  if (!isLoading.value)
    player.reloadCurrentSong()
})

onMounted(() => {
  player.initPlayer()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Toaster position="top-center" rich-colors :theme="theme.isDark ? 'dark' : 'light'" />
  <BackgroundLayer />
  <Header />
  <DesktopSidebar v-if="isDesktop" />

  <OverlayScrollbarsComponent
    id="page-scroll"
    element="main"
    class="page-scroll fixed top-[56px] bottom-[72px] left-0 right-0 xl:left-[240px]"
    :options="pageScrollOptions"
    @os-initialized="onPageScrollInitialized"
    @os-scroll="onPageScroll"
    @os-destroyed="onPageScrollDestroyed"
  >
    <div v-if="!initialDataReady" class="app-bootstrap-state flex items-center justify-center px-4 py-6 text-center">
      <AsyncFade>
        <div v-if="initialDataError" role="alert">
          <p class="text-sm text-red-500">
            加载失败，请稍后重试
          </p>
          <AppButton class="mt-3" size="sm" :disabled="!canRetryInitialData" @click="retryInitialData">
            重试
          </AppButton>
        </div>
        <div v-else class="flex items-center justify-center gap-2 text-gray-400" role="status">
          <LucideLoader2 class="size-5 animate-spin" />
          加载中...
        </div>
      </AsyncFade>
    </div>
    <div v-else class="app-page-content relative px-4 md:px-16 xl:px-8 pt-6 pb-7">
      <router-view v-slot="{ Component }">
        <!-- enter 时新页面已插入 DOM 且仍透明，滚动应在淡入开始前恢复。 -->
        <Transition name="page-fade" mode="out-in" appear @enter="completePageRender">
          <component :is="Component" :key="$route.path" />
        </Transition>
      </router-view>
    </div>
  </OverlayScrollbarsComponent>

  <PlayerPlaylist />
  <PlayerBar />
  <PlayerFullscreen />
  <FloatingActions />
  <NoticeDialog />
</template>

<style scoped>
.app-bootstrap-state,
.app-page-content {
  min-height: calc(100vh - 128px);
  min-height: calc(100dvh - 128px);
}

.page-scroll :deep([data-overlayscrollbars-viewport]) {
  overscroll-behavior: contain;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.15s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>

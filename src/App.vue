<script setup lang="ts">
import type { OverlayScrollbars, PartialOptions } from 'overlayscrollbars'
import { useQueryClient } from '@tanstack/vue-query'
import { useMediaQuery } from '@vueuse/core'
import { toast, Toaster } from 'vue-sonner'
import { useAlbumListQuery, useAppConfigQuery } from '@/composables/queries'
import { scrollPageToTop, setPageScrollElement, updatePageScroll } from '@/composables/usePageScroll'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { useMediaSourceStore } from '@/store/media-source'
import { usePlayerStore } from '@/store/player'

const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()
const queryClient = useQueryClient()
const mediaSource = useMediaSourceStore()
const isDesktop = useMediaQuery('(min-width: 1280px)')
const route = useRoute()
const { albumList, showSearch } = storeToRefs(store)
const { volume, isFullscreen, showPlaylist, isLoading } = storeToRefs(player)

const { data: albumListData, isError: isAlbumListError, error: albumListError } = useAlbumListQuery()

const { data: appConfigData } = useAppConfigQuery()

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
  if (val)
    toast.error(`专辑列表加载失败：${albumListError.value?.message ?? '未知错误'}`)
})

watch(() => auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    store.fetchFavoriteSongs()
    store.fetchFavoritePlaylists()
  }
  else {
    store.clearFavorites()
  }
}, { immediate: true })

// 评论列表包含当前用户的审核状态与投票，切换账号时不能复用旧身份缓存。
watch(() => auth.user?.id ?? null, () => {
  queryClient.removeQueries({ queryKey: ['commentThreads'] })
  queryClient.removeQueries({ queryKey: ['commentReplies'] })
}, { immediate: true })

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  // 输入框/文本域/可编辑元素内不触发
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
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

watch(() => route.fullPath, async () => {
  await nextTick()
  scrollPageToTop()
})

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
  <Toaster position="top-center" rich-colors />
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
    <div class="px-4 md:px-16 xl:px-8 pt-6 pb-7">
      <router-view v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in" appear>
          <component :is="Component" :key="$route.path" />
        </Transition>
      </router-view>
    </div>
  </OverlayScrollbarsComponent>

  <PlayerPlaylist />
  <PlayerBar />
  <PlayerFullscreen />
  <FloatingActions />
</template>

<style scoped>
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

<script setup lang="ts">
import { useOverlayScrollbars } from 'overlayscrollbars-vue'
import { toast, Toaster } from 'vue-sonner'
import { useAlbumListQuery } from '@/composables/queries'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'

const store = useStore()
const player = usePlayerStore()
const { albumList, showSearch } = storeToRefs(store)
const { volume, isFullscreen, showPlaylist } = storeToRefs(player)

const { data: albumListData, isError: isAlbumListError } = useAlbumListQuery()

watch(albumListData, (data) => {
  if (data)
    albumList.value = [...data].reverse()
}, { immediate: true })

watch(isAlbumListError, (val) => {
  if (val)
    toast.error('专辑列表加载失败')
})

const [initBodyScrollbars, useOsInstance] = useOverlayScrollbars({
  defer: true,
  options: {
    scrollbars: {
      theme: 'os-theme-custom',
      autoHide: 'leave',
      clickScroll: true,
    },
  },
})

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

watch(() => isFullscreen.value || showPlaylist.value || showSearch.value, (val) => {
  const osInstance = useOsInstance()
  osInstance?.options({
    overflow: {
      y: val ? 'hidden' : 'scroll',
    },
  })
}, { immediate: true })

onMounted(() => {
  initBodyScrollbars({ target: document.body })
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

  <div class="min-h-screen backdrop-blur-2xl bg-white/80">
    <div class="px-4 md:px-16 xl:px-32 pt-[80px] pb-[100px]">
      <router-view v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in" appear>
          <component :is="Component" :key="$route.path" />
        </Transition>
      </router-view>
    </div>
  </div>

  <PlayerPlaylist />
  <PlayerBar />
  <PlayerFullscreen />
</template>

<style scoped>
.page-fade-enter-active {
  transition: opacity 0.3s ease;
}

.page-fade-enter-from {
  opacity: 0;
}
</style>

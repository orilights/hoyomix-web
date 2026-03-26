<script setup lang="ts">
import type { ExportAlbumListItem } from './types/export'
import { useOverlayScrollbars } from 'overlayscrollbars-vue'
import { getAlbumListApi } from '@/api'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'

const store = useStore()
const playerStore = usePlayerStore()
const { albumList, backgroundUrl, showSearch } = storeToRefs(store)
const { volume, isFullscreen, showPlaylist } = storeToRefs(playerStore)

const background1 = useTemplateRef<HTMLElement>('background1')
const background2 = useTemplateRef<HTMLElement>('background2')
const showBackground = ref(1)

watch(backgroundUrl, (newVal) => {
  if (newVal) {
    if (showBackground.value === 1) {
      background2.value!.style.setProperty('--background-image', `url(${newVal})`)
      showBackground.value = 2
    }
    else {
      background1.value!.style.setProperty('--background-image', `url(${newVal})`)
      showBackground.value = 1
    }
  }
  else {
    showBackground.value = 0
  }
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
    playerStore.togglePlay()
  }
  else if (e.code === 'ArrowUp') {
    e.preventDefault()
    playerStore.setVolume(volume.value + 0.05)
  }
  else if (e.code === 'ArrowDown') {
    e.preventDefault()
    playerStore.setVolume(volume.value - 0.05)
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
  playerStore.initPlayer()
  window.addEventListener('keydown', onKeydown)

  getAlbumListApi()
    .then(res => res.json())
    .then((data: ExportAlbumListItem[]) => {
      data.reverse()
      albumList.value = data
    })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    ref="background1"
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500 blur-md" :class="{
      'opacity-0': showBackground !== 1,
      'opacity-100': showBackground === 1,
    }"
  />
  <div
    ref="background2"
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500 blur-md" :class="{
      'opacity-0': showBackground !== 2,
      'opacity-100': showBackground === 2,
    }"
  />
  <Header />
  <div class="min-h-screen backdrop-blur-2xl bg-white/80">
    <div class="px-4 md:px-16 xl:px-32 pt-[80px] pb-[100px]">
      <router-view v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
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
.page-background {
  background-image: var(--background-image);
  background-size: cover;
  background-position: center;
}
</style>

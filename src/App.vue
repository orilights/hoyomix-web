<script setup lang="ts">
import type { ExportAlbumListItem } from './types/export'
import { useOverlayScrollbars } from 'overlayscrollbars-vue'
import { getAlbumListApi } from '@/api'
import DefaultLayout from '@/layout/DefaultLayout.vue'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'

const store = useStore()
const playerStore = usePlayerStore()
const { albumList } = storeToRefs(store)
const { volume, isFullscreen, showPlaylist } = storeToRefs(playerStore)

const layout = shallowRef(DefaultLayout)

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

watch(() => isFullscreen.value || showPlaylist.value, (val) => {
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
  <component :is="layout">
    <router-view />
  </component>
</template>

<style>
body {
  --background-image: url('');
  background-image: var(--background-image);
  background-size: cover;
  background-position: center;
}
</style>

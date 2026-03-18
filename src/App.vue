<script setup lang="ts">
import type { ExportAlbumListItem } from './types/export'
import { getAlbumListApi } from '@/api'
import DefaultLayout from '@/layout/DefaultLayout.vue'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'

const store = useStore()
const playerStore = usePlayerStore()
const { albumList } = storeToRefs(store)

const layout = shallowRef(DefaultLayout)

onMounted(() => {
  playerStore.initPlayer()

  getAlbumListApi()
    .then(res => res.json())
    .then((data: ExportAlbumListItem[]) => {
      data.reverse()
      albumList.value = data
    })
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

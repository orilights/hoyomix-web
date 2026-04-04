<script setup lang="ts">
import { useStore } from '@/store'

const store = useStore()
const { albumList } = storeToRefs(store)

onMounted(() => {
  document.title = 'HOYO-MiX Online'
  store.setBackground()
})
</script>

<template>
  <AlbumList :albums-list="albumList" display-by-year persist-key="home" />
</template>

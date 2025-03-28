<script setup lang="ts">
import { useStore } from '@/store'

const store = useStore()
const { albums } = toRefs(store)

onMounted(() => {
  document.title = 'HOYO-MiX Online'
  store.setBackground()
})
</script>

<template>
  <AlbumList :albums-list="albums" display-by-year />
</template>

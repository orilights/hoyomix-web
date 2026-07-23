<script setup lang="ts">
import { useMainStore } from '@/store/main'

const store = useMainStore()
const { albumList } = storeToRefs(store)

onMounted(() => {
  document.title = '全部专辑 - HOYO-MiX Online'
  store.setBackground()
})
</script>

<template>
  <div>
    <PageHeader title="全部专辑" subtitle="已收录的所有专辑" />

    <AlbumList :albums-list="albumList" display-by-year persist-key="albums" />
  </div>
</template>

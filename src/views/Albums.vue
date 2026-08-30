<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { useMainStore } from '@/store/main'

const store = useMainStore()
const { albumList } = storeToRefs(store)

usePageSeo({
  title: '全部专辑',
  description: '已收录的所有专辑',
  path: '/albums',
})

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div>
    <PageHeader title="全部专辑" subtitle="已收录的所有专辑" />

    <AlbumList :albums-list="albumList" display-by-year persist-key="albums" />
  </div>
</template>

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
    <div class="pb-4">
      <h1 class="text-2xl md:text-3xl font-bold">
        全部专辑
      </h1>
      <p class="text-gray-500 text-sm mt-1">
        已收录的所有专辑
      </p>
    </div>

    <AlbumList :albums-list="albumList" display-by-year persist-key="albums" />
  </div>
</template>

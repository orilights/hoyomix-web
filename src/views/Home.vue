<script setup lang="ts">
import { useStore } from '@/store'

const store = useStore()
const { albumList } = storeToRefs(store)

const totalSongs = computed(() =>
  albumList.value.reduce((acc, a) => acc + a.songCount, 0),
)

onMounted(() => {
  document.title = 'HOYO-MiX Online'
  store.setBackground()
})
</script>

<template>
  <div>
    <RouterLink
      :to="{ name: 'Statistics' }"
      class="flex items-center justify-between bg-black/5 hover:bg-black/10 transition-colors rounded-xl px-4 py-3 mb-4"
    >
      <div class="flex items-center gap-4 text-sm">
        收录数据
        <span class="text-gray-500">专辑</span>
        <span class="font-medium">{{ albumList.length }}</span>
        <span class="text-gray-500">歌曲</span>
        <span class="font-medium">{{ totalSongs }}</span>
      </div>
      <div class="flex items-center gap-1 text-sm text-blue-500 shrink-0">
        查看统计
        <LucideChevronRight class="size-4" />
      </div>
    </RouterLink>
    <AlbumList :albums-list="albumList" display-by-year persist-key="home" />
  </div>
</template>

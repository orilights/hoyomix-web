<script setup lang="ts">
import type { TagInfo } from '@/types/export'

defineProps<{
  tags: TagInfo[]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-x-2 gap-y-1">
    <template v-for="(tagInfo, index) in tags" :key="index">
      <div v-if="tagInfo.tagType === 'version'" class="px-2 py-0.5 bg-black/5 rounded-xl">
        发布版本：{{ tagInfo.tagName }}
      </div>
      <RouterLink
        v-if="tagInfo.tagType === 'series'"
        :to="{ name: 'AlbumSeries', params: { seriesName: tagInfo.tagName } }"
        class="px-2 py-0.5 bg-black/5 rounded-xl hover:bg-black/10 transition-colors"
      >
        {{ tagInfo.tagName }} 系列专辑
      </RouterLink>
    </template>
    <div v-if="tags.length === 0" class="text-gray-500 text-center w-full">
      无标签
    </div>
  </div>
</template>

<style scoped>
</style>

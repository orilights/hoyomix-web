<script setup lang="ts">
import type { TagInfo } from '@/types/export'

defineProps<{
  tags: TagInfo[]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-x-2">
    <template v-for="(tagInfo, index) in tags" :key="index">
      <div v-if="tagInfo.tagType === 'version'">
        发布版本：{{ tagInfo.tagName }}
      </div>
    </template>
    <div v-if="tags.length === 0" class="text-gray-500 text-center w-full">
      无标签
    </div>
  </div>
</template>

<style scoped>

</style>

<script setup lang="ts">
import type { AnalysisKeyword } from '@/types/song-analysis'

defineProps<{ keywords: AnalysisKeyword[], label: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5 text-xs">
    <span v-if="label" class="text-gray-500 dark:text-gray-400 mr-1">{{ label }}</span>
    <span
      v-for="item in keywords" :key="item.keyword"
      class="rounded-md px-2 py-1"
      :class="item.type === 'primary' ? 'bg-black/5 dark:bg-white/10' : 'text-gray-500 dark:text-gray-400'"
    >{{ item.keyword }}</span>
  </div>
</template>

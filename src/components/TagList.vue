<script setup lang="ts">
import type { TagInfo } from '@/types/core'
import { formatDuration } from '@/utils'

defineProps<{
  tags: TagInfo[]
}>()

const videoSourceMap: Record<string, string> = {
  web: '官网',
}

function openLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
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

      <div
        v-if="tagInfo.tagType === 'area' && tagInfo.tagData"
        class="px-2 py-0.5 bg-black/5 rounded-xl flex flex-wrap items-center gap-1 text-sm"
      >
        <span class="text-gray-500">{{ tagInfo.tagName }}：</span>
        <template v-for="(levelKey, li) in Object.keys(tagInfo.tagData).sort()" :key="li">
          <LucideChevronRight v-if="li > 0" class="h-3 w-3 text-gray-400" />
          <span>{{ tagInfo.tagData[levelKey] }}</span>
        </template>
      </div>

      <div
        v-if="tagInfo.tagType === 'video' && tagInfo.tagData"
        class="relative flex items-center w-full overflow-hidden rounded-xl cursor-pointer group py-4 group"
        @click="openLink(tagInfo.tagData.link)"
      >
        <img
          :src="tagInfo.tagData.cover"
          :alt="tagInfo.tagName"
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        >
        <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
        <div class="relative flex-1 min-w-0 px-4">
          <p class="text-white text-sm font-medium truncate">
            {{ tagInfo.tagName }}
          </p>
          <p class="text-gray-300 text-xs mt-1 truncate">
            {{ formatDuration(tagInfo.tagData.duration) }}
            <template v-if="tagInfo.tagData.source">
              {{ ` · ${videoSourceMap[tagInfo.tagData.source] || tagInfo.tagData.source}` }}
            </template>
          </p>
        </div>
        <a
          :href="tagInfo.tagData.url"
          target="_blank"
          rel="noopener noreferrer"
          class="relative flex-shrink-0 px-4 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100"
          @click.stop
        >
          <span class="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <LucidePlay class="ml-0.5 h-5 w-5 fill-white text-white" />
          </span>
        </a>
      </div>
    </template>
  </div>
</template>

<style scoped>
</style>

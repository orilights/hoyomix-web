<script setup lang="ts">
import type { TagInfo } from '@/types/core'
import type { VideoTagData } from '@/types/tag'
import { formatDuration } from '@/utils'

defineProps<{
  tags: TagInfo[]
}>()

const videoSourceMap: Record<string, string> = {
  web: '官网',
  mys: '米游社',
  bilibili: 'Bilibili',
}

const layerAIndex = ref(0)
const layerBIndex = ref<number | null>(null)
const visibleLayer = ref<'a' | 'b'>('a')

function getVideoData(tagData: any): VideoTagData {
  return tagData as VideoTagData
}

function handleSourceHover(si: number) {
  const currentIdx = visibleLayer.value === 'a' ? layerAIndex.value : layerBIndex.value!
  if (si === currentIdx)
    return
  if (visibleLayer.value === 'a') {
    layerBIndex.value = si
    visibleLayer.value = 'b'
  }
  else {
    layerAIndex.value = si
    visibleLayer.value = 'a'
  }
}

function sourceName(source: string) {
  return videoSourceMap[source] || source
}

function goSourceLink(url: string) {
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
        class="relative w-full overflow-hidden rounded-xl p-4"
      >
        <img
          :src="getVideoData(tagInfo.tagData).sources[layerAIndex].coverUrl"
          :alt="tagInfo.tagName"
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          :class="visibleLayer === 'a' ? 'opacity-100' : 'opacity-0'"
          referrerpolicy="no-referrer"
        >
        <img
          v-if="layerBIndex !== null"
          :src="getVideoData(tagInfo.tagData).sources[layerBIndex].coverUrl"
          :alt="tagInfo.tagName"
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          :class="visibleLayer === 'b' ? 'opacity-100' : 'opacity-0'"
          referrerpolicy="no-referrer"
        >
        <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/40" />
        <div class="relative flex flex-col gap-2">
          <p class="text-white text-sm font-medium truncate">
            {{ tagInfo.tagName }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="(source, si) in getVideoData(tagInfo.tagData).sources"
              :key="si"
              class="flex items-center gap-1 px-2 py-1 rounded-full bg-white/15 hover:bg-white/30 transition-colors cursor-pointer text-white text-xs"
              @mouseenter="handleSourceHover(si)"
              @click="goSourceLink(source.link)"
            >
              <img v-if="source.source === 'mys'" src="/images/icon/mys.png" class="w-4 h-4 object-contain rounded-full">
              <img v-else-if="source.source === 'bilibili'" src="/images/icon/bilibili.png" class="w-4 h-4 object-contain rounded-full">
              <LucideGlobe v-else class="w-4 h-4" />
              <span>{{ sourceName(source.source) }}</span>
              <template v-if="source.duration">
                <span class="text-white/60">·</span>
                <span>{{ formatDuration(source.duration) }}</span>
              </template>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
</style>

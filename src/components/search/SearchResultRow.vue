<script setup lang="ts">
import type { SearchResultItem } from '@/types/search'
import { useMainStore } from '@/store/main'
import { getCoverUrl, getProductIconUrl, sanitizeHighlight } from '@/utils'
import { searchTypeOptions } from '@/utils/search'

const props = defineProps<{ item: SearchResultItem, active?: boolean }>()
const emit = defineEmits<{ select: [item: SearchResultItem] }>()
const store = useMainStore()
const typeLabel = computed(() => searchTypeOptions.find(option => option.value === props.item.type)?.label)
const imageUrl = computed(() => {
  const item = props.item
  if (item.type === 'product')
    return getProductIconUrl(item.name, '48px')
  const albumId = item.type === 'song' ? item.albumId : item.type === 'album' ? item.id : undefined
  const album = store.albumList.find(album => album.id === albumId)
  return album ? getCoverUrl(album.platforms, '96px') : undefined
})
const subtitle = computed(() => {
  const item = props.item
  if (item.type === 'song')
    return [item.albumName, item.productName].filter(Boolean).join(' · ')
  if (item.type === 'album')
    return [item.productName, item.publishDate].filter(Boolean).join(' · ')
  return ''
})
const snippets = computed(() => ['description', 'descriptionFull', 'lyrics', 'alias', 'mapNames', 'videoNames']
  .filter(field => props.item.matches[field])
  .map(field => ({ field, html: sanitizeHighlight(props.item.matches[field]!) })))
</script>

<template>
  <button
    type="button"
    data-search-result
    class="w-full flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer text-left"
    :class="active ? 'bg-blue-500/10' : 'hover:bg-black/5 hover:dark:bg-white/5'"
    @click="emit('select', item)"
  >
    <div class="shrink-0 mt-0.5">
      <LazyImg v-if="imageUrl" class="size-10" :class="item.type === 'product' ? 'rounded-full' : 'rounded-lg'" :src="imageUrl" />
      <div v-else class="size-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <LucideUser v-if="item.type === 'artist'" class="size-5 text-gray-400" />
        <LucideDisc v-else class="size-5 text-gray-400" />
      </div>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">{{ typeLabel }}</span>
        <span v-if="item.matches.name" class="search-highlight truncate font-medium" v-html="sanitizeHighlight(item.matches.name)" />
        <span v-else class="truncate font-medium">{{ item.name }}</span>
      </div>
      <div v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
        {{ subtitle }}
      </div>
      <div v-for="snippet in snippets" :key="snippet.field" class="search-highlight text-xs text-gray-400 truncate mt-0.5" v-html="snippet.html" />
    </div>
  </button>
</template>

<style scoped>
.search-highlight :deep(em) {
  color: #ef4444;
  font-style: normal;
}
</style>

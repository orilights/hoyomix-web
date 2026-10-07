<script setup lang="ts">
import type { SearchResultItem, SearchType } from '@/types/search'
import { LucideDisc } from '@lucide/vue'
import { refDebounced, useResizeObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useSearchQuery } from '@/composables/queries'
import { useMainStore } from '@/store/main'
import { getCoverUrl, getProductIconUrl, sanitizeHighlight } from '@/utils'

const visible = defineModel<boolean>({ required: true })
const router = useRouter()
const store = useMainStore()
const { albumList } = storeToRefs(store)

const keyword = ref('')
const searchType = ref<SearchType | undefined>(undefined)

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const itemRefs = ref<HTMLElement[]>([])
const contentRef = useTemplateRef<HTMLElement>('contentRef')
const contentHeight = ref<number | null>(null)

useResizeObserver(contentRef, (entries) => {
  contentHeight.value = entries[0].contentRect.height
})
const activeIndex = ref(-1)

function setItemRef(el: HTMLElement | null, index: number) {
  if (el)
    itemRefs.value[index] = el
}

const typeOptions: { label: string, value: SearchType | undefined }[] = [
  { label: '全部', value: undefined },
  { label: '歌曲', value: 'song' },
  { label: '专辑', value: 'album' },
  { label: '专辑系列', value: 'series' },
  { label: '游戏', value: 'product' },
  { label: '艺术家', value: 'artist' },
]
const searchMode = computed({
  get: () => searchType.value ?? 'all',
  set: (value: SearchType | 'all') => {
    searchType.value = value === 'all' ? undefined : value
  },
})
const searchModeOptions = typeOptions.map(option => ({ key: option.value ?? 'all', label: option.label }))

const debouncedKeyword = refDebounced(keyword, 300)

const { data: searchData, isFetching, isError, error } = useSearchQuery(debouncedKeyword, searchType)

const results = computed<SearchResultItem[]>(() => searchData.value?.results ?? [])
const isTyping = computed(() => keyword.value.trim() !== debouncedKeyword.value.trim())
const showLoading = computed(() => isTyping.value || isFetching.value)
const hasSearched = computed(() => debouncedKeyword.value.trim() !== '')

watch(isError, (val) => {
  if (val)
    toast.error(`搜索失败：${error.value?.message ?? '未知错误'}`)
})

watch(keyword, () => {
  activeIndex.value = -1
})

watch(searchType, () => {
  activeIndex.value = -1
})

watch(results, () => {
  activeIndex.value = -1
  itemRefs.value = []
})

watch(visible, (val) => {
  if (val) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
  else {
    keyword.value = ''
    searchType.value = undefined
    activeIndex.value = -1
    itemRefs.value = []
  }
})

function close() {
  contentHeight.value = null
  visible.value = false
}

const mousedownOnOverlay = ref(false)

function onOverlayMousedown(e: MouseEvent) {
  mousedownOnOverlay.value = e.target === e.currentTarget
}

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget && mousedownOnOverlay.value)
    close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
    return
  }
  if (!visible.value)
    return

  if (e.key === 'ArrowDown') {
    // 阻止播放器全局音量快捷键
    e.preventDefault()
    e.stopImmediatePropagation()
    if (results.value.length === 0)
      return
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
    nextTick(() => {
      itemRefs.value[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
    })
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopImmediatePropagation()
    if (results.value.length === 0)
      return
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    nextTick(() => {
      itemRefs.value[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
    })
  }
  else if (e.key === 'Enter') {
    e.preventDefault()
    e.stopImmediatePropagation()
    if (activeIndex.value >= 0 && results.value[activeIndex.value]) {
      toResult(results.value[activeIndex.value])
    }
  }
}

function getTypeLabel(type: SearchType) {
  switch (type) {
    case 'song': return '歌曲'
    case 'album': return '专辑'
    case 'product': return '游戏'
    case 'artist': return '艺术家'
    case 'series': return '专辑系列'
  }
}

function getItemImageUrl(item: SearchResultItem): string | undefined {
  if (item.type === 'song') {
    const album = albumList.value.find(a => a.id === item.albumId)
    return album ? getCoverUrl(album.platforms, '96px') : undefined
  }
  if (item.type === 'album') {
    const album = albumList.value.find(a => a.id === item.id)
    return album ? getCoverUrl(album.platforms, '96px') : undefined
  }
  if (item.type === 'product') {
    return getProductIconUrl(item.name as string, '48px')
  }
  return undefined
}

function getHighlight(item: SearchResultItem, field: string) {
  if (item.matches[field])
    return sanitizeHighlight(item.matches[field])
  return undefined
}

function getSubtitle(item: SearchResultItem) {
  switch (item.type) {
    case 'song': return [item.albumName, item.productName].filter(Boolean).join(' · ')
    case 'album': return [item.productName, item.publishDate].filter(Boolean).join(' · ')
    default: return ''
  }
}

function toResult(item: SearchResultItem) {
  switch (item.type) {
    case 'song':
      router.push({ name: 'MusicInfo', params: { albumId: item.albumId, musicId: item.id } })
      break
    case 'album':
      router.push({ name: 'AlbumInfo', params: { id: item.id } })
      break
    case 'product':
      router.push({ name: 'ProductInfo', params: { name: item.name } })
      break
    case 'artist':
      router.push({ name: 'ArtistInfo', params: { name: item.name } })
      break
    case 'series':
      router.push({ name: 'AlbumSeries', params: { seriesName: item.name } })
  }
  close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-999 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[10vh] md:pt-[15vh] px-4"
        @mousedown="onOverlayMousedown"
        @click="onOverlayClick"
      >
        <div class="w-full max-w-2xl bg-white dark:bg-[var(--theme-surface)] rounded-xl shadow-2xl overflow-hidden">
          <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <LucideSearch class="size-5 text-gray-400 shrink-0" />
            <input
              ref="inputRef"
              v-model="keyword"
              type="text"
              placeholder="搜索歌曲、专辑、游戏、艺术家..."
              class="flex-1 text-base outline-none bg-transparent placeholder-gray-400"
            >
            <kbd class="hidden md:inline-flex items-center text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">ESC</kbd>
          </div>

          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <SegmentSwitch v-model="searchMode" :options="searchModeOptions" class="min-w-max" aria-label="搜索类型" />
          </div>

          <div
            class="overflow-hidden transition-[height] duration-300 ease-in-out"
            :style="contentHeight !== null ? { height: `${contentHeight}px` } : {}"
          >
            <div ref="contentRef" class="max-h-[60vh] overflow-y-auto">
              <AsyncFade>
                <div v-if="showLoading && results.length === 0" class="flex items-center justify-center py-12 text-gray-400">
                  <LucideLoader2 class="size-5 animate-spin mr-2" />
                  搜索中...
                </div>

                <div v-else-if="hasSearched && !showLoading && results.length === 0" class="py-12 text-center text-gray-400">
                  未找到相关结果
                </div>

                <div v-else-if="results.length > 0" class="py-2">
                  <button
                    v-for="(item, index) in results"
                    :key="`${item.type}-${item.id}`"
                    :ref="(el) => setItemRef(el as HTMLElement, index)"
                    class="w-full flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer text-left"
                    :class="activeIndex === index ? 'bg-blue-500/10' : 'hover:bg-black/5 hover:dark:bg-white/5'"
                    @click="toResult(item)"
                    @mouseenter="activeIndex = index"
                  >
                    <div class="shrink-0 mt-0.5">
                      <LazyImg
                        v-if="getItemImageUrl(item)"
                        class="size-10"
                        :class="item.type === 'product' ? 'rounded-full' : 'rounded-lg'"
                        :src="getItemImageUrl(item)"
                      />
                      <div v-else class="size-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <LucideUser v-if="item.type === 'artist'" class="size-5 text-gray-400" />
                        <LucideDisc v-if="item.type === 'series'" class="size-5 text-gray-400" />
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
                          {{ getTypeLabel(item.type) }}
                        </span>
                        <span
                          class="search-highlight truncate font-medium"
                          v-html="getHighlight(item, 'name') || item.name"
                        />
                      </div>
                      <div v-if="getSubtitle(item)" class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {{ getSubtitle(item) }}
                      </div>
                      <div
                        v-if="getHighlight(item, 'description')"
                        class="search-highlight text-xs text-gray-400 truncate mt-0.5"
                        v-html="getHighlight(item, 'description')"
                      />
                      <div
                        v-if="getHighlight(item, 'lyrics')"
                        class="search-highlight text-xs text-gray-400 truncate mt-0.5"
                        v-html="getHighlight(item, 'lyrics')"
                      />
                      <div
                        v-if="getHighlight(item, 'alias')"
                        class="search-highlight text-xs text-gray-400 truncate mt-0.5"
                        v-html="getHighlight(item, 'alias')"
                      />
                      <div
                        v-if="getHighlight(item, 'mapNames')"
                        class="search-highlight text-xs text-gray-400 truncate mt-0.5"
                        v-html="getHighlight(item, 'mapNames')"
                      />
                      <div
                        v-if="getHighlight(item, 'videoNames')"
                        class="search-highlight text-xs text-gray-400 truncate mt-0.5"
                        v-html="getHighlight(item, 'videoNames')"
                      />
                    </div>
                  </button>
                </div>

                <div v-else-if="!keyword.trim()" class="py-12 text-center text-gray-400">
                  输入关键词开始搜索
                </div>
              </AsyncFade>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.2s ease;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}

.search-highlight :deep(em) {
  color: #ef4444;
  font-style: normal;
}
</style>

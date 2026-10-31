<script setup lang="ts">
import type { SearchResultItem, SearchType } from '@/types/search'
import { refDebounced, useResizeObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useSearchQuery } from '@/composables/queries'
import { t } from '@/i18n'
import { searchQuery, searchResultRoute, searchTypeOptions } from '@/utils/search'

const visible = defineModel<boolean>({ required: true })
const router = useRouter()

const keyword = ref('')
const searchType = ref<SearchType | undefined>(undefined)

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const contentRef = useTemplateRef<HTMLElement>('contentRef')
const contentHeight = ref<number | null>(null)

useResizeObserver(contentRef, (entries) => {
  contentHeight.value = entries[0].contentRect.height
})
const activeIndex = ref(-1)

const debouncedKeyword = refDebounced(keyword, 300)

const { data: searchData, isFetching, isError, error, refetch } = useSearchQuery(debouncedKeyword, searchType)

const results = computed<SearchResultItem[]>(() => searchData.value?.results ?? [])
const isTyping = computed(() => keyword.value.trim() !== debouncedKeyword.value.trim())
const showLoading = computed(() => isTyping.value || isFetching.value)
const hasSearched = computed(() => debouncedKeyword.value.trim() !== '')

watch(isError, (val) => {
  if (val)
    toast.error(t('SearchModal.search_failed', { p0: error.value?.message ?? t('App.unknown_error') }))
})

watch(keyword, () => {
  activeIndex.value = -1
})

watch(searchType, () => {
  activeIndex.value = -1
})

watch(results, () => {
  activeIndex.value = -1
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
  if (!visible.value || e.isComposing || e.keyCode === 229)
    return
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.target !== inputRef.value)
    return

  if (e.key === 'ArrowDown') {
    // 阻止播放器全局音量快捷键
    e.preventDefault()
    e.stopImmediatePropagation()
    if (results.value.length === 0)
      return
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
    nextTick(() => {
      contentRef.value?.querySelectorAll('[data-search-result]')[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
    })
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopImmediatePropagation()
    if (results.value.length === 0)
      return
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    nextTick(() => {
      contentRef.value?.querySelectorAll('[data-search-result]')[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
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

function toResult(item: SearchResultItem) {
  void router.push(searchResultRoute(item))
  close()
}

function viewMore() {
  const query = searchQuery(keyword.value, searchType.value)
  close()
  void router.push({ name: 'Search', query })
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
              :placeholder="t('SearchModal.search_songs_albums_games_artists')"
              class="flex-1 text-base outline-none bg-transparent placeholder-gray-400"
            >
            <kbd class="hidden md:inline-flex items-center text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">ESC</kbd>
          </div>

          <FilterChips
            v-model="searchType"
            :options="searchTypeOptions"
            scroll
            class="px-4 py-2 border-b border-gray-200 dark:border-gray-700"
            :aria-label="t('SearchModal.search_type')"
          />

          <div
            class="overflow-hidden transition-[height] duration-300 ease-in-out"
            :style="contentHeight !== null ? { height: `${contentHeight}px` } : {}"
          >
            <div ref="contentRef" class="search-results overflow-y-auto">
              <AsyncFade :animate-height="false">
                <div v-if="showLoading && results.length === 0" role="status" class="flex items-center justify-center py-12 text-gray-400">
                  <LucideLoader2 class="size-5 animate-spin mr-2" />{{ t('SearchModal.searching') }}
                </div>

                <div v-else-if="isError && !showLoading" class="py-12 text-center text-gray-400" role="alert">
                  {{ t('SearchModal.search_failed_alternate') }}<AppButton class="ml-2" size="sm" variant="ghost" @click="refetch()">
                    {{ t('App.retry') }}
                  </AppButton>
                </div>

                <div v-else-if="hasSearched && !showLoading && results.length === 0" class="py-12 text-center text-gray-400">
                  {{ t('SearchModal.no_results_found') }}
                </div>

                <div v-else-if="results.length > 0" class="py-2">
                  <SearchResultRow
                    v-for="(item, index) in results"
                    :key="`${item.type}-${item.id}`"
                    :item="item"
                    :active="activeIndex === index"
                    @select="toResult"
                    @mouseenter="activeIndex = index"
                  />
                </div>

                <div v-else-if="!keyword.trim()" class="py-12 text-center text-gray-400">
                  {{ t('SearchModal.enter_a_keyword_to_search') }}
                </div>
              </AsyncFade>
            </div>
          </div>
          <div v-if="results.length > 0" class="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <AppButton variant="ghost" class="w-full" @click="viewMore">
              {{ t('SearchModal.view_more') }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-results {
  max-height: min(60vh, calc(80vh - 160px));
}

.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.2s ease;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}
</style>

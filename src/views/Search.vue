<script setup lang="ts">
import type { SearchResultItem, SearchType } from '@/types/search'
import { useSearchPageQuery } from '@/composables/queries'
import { scrollPageToElement } from '@/composables/usePageScroll'
import { usePageSeo } from '@/composables/usePageSeo'
import { parseSearchType, searchQuery, searchResultRoute, searchTypeOptions } from '@/utils/search'

const route = useRoute()
const router = useRouter()
const queryKeyword = computed(() => typeof route.query.q === 'string' ? route.query.q.trim() : '')
const searchType = computed(() => parseSearchType(route.query.type))
const page = computed(() => {
  const raw = route.query.page
  return typeof raw === 'string' && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : 1
})
const keyword = ref(queryKeyword.value)
const composing = ref(false)
const activeIndex = ref(-1)
const resultsSection = useTemplateRef<HTMLElement>('resultsSection')
let inputTimer: ReturnType<typeof setTimeout> | undefined
let scrollAfterNavigation: string | undefined

usePageSeo({ title: computed(() => queryKeyword.value ? `搜索：${queryKeyword.value}` : '搜索'), path: '/search', noindex: true })
const { data, isFetching, isError, error, refetch } = useSearchPageQuery(queryKeyword, searchType, page)
const isTyping = computed(() => keyword.value.trim() !== queryKeyword.value || composing.value)
const results = computed(() => isTyping.value ? [] : data.value?.results ?? [])
const pagination = computed(() => data.value?.pagination)
const pages = computed(() => {
  const total = pagination.value?.totalPages ?? 0
  if (total <= 7)
    return Array.from({ length: total }, (_, index) => index + 1)
  return [...new Set([1, page.value - 1, page.value, page.value + 1, total])]
    .filter(value => value >= 1 && value <= total)
    .sort((a, b) => a - b)
})

watch(() => route.query, () => {
  clearTimeout(inputTimer)
  if (scrollAfterNavigation !== route.fullPath)
    scrollAfterNavigation = undefined
  keyword.value = queryKeyword.value
  activeIndex.value = -1
  const query = searchQuery(queryKeyword.value, searchType.value, page.value)
  const normalized = router.resolve({ path: '/search', query, hash: route.hash })
  if (normalized.fullPath !== route.fullPath)
    void router.replace({ path: '/search', query, hash: route.hash })
}, { immediate: true })

watch([keyword, composing], () => {
  clearTimeout(inputTimer)
  activeIndex.value = -1
  if (composing.value || keyword.value.trim() === queryKeyword.value)
    return
  inputTimer = setTimeout(submitSearch, 300)
})

function submitSearch() {
  clearTimeout(inputTimer)
  if (!composing.value)
    void router.replace({ name: 'Search', query: searchQuery(keyword.value, searchType.value) })
}

function setType(type: SearchType | undefined) {
  clearTimeout(inputTimer)
  void router.push({ name: 'Search', query: searchQuery(keyword.value, type) })
}

function setPage(value: number) {
  if (value === page.value || value < 1 || value > (pagination.value?.totalPages ?? 0))
    return
  const target = { name: 'Search', query: searchQuery(queryKeyword.value, searchType.value, value) }
  scrollAfterNavigation = router.resolve(target).fullPath
  void router.push(target)
}

watch([data, () => route.fullPath], async ([response]) => {
  if (!queryKeyword.value || !response || response.pagination.page !== page.value)
    return
  const lastPage = Math.max(1, response.pagination.totalPages)
  if (page.value > lastPage) {
    const query = searchQuery(queryKeyword.value, searchType.value, lastPage)
    void router.replace({ name: 'Search', query })
    return
  }
  if (scrollAfterNavigation !== route.fullPath)
    return
  const targetPath = scrollAfterNavigation
  await nextTick()
  if (route.fullPath === targetPath && resultsSection.value) {
    scrollPageToElement(resultsSection.value, 16)
    scrollAfterNavigation = undefined
  }
}, { flush: 'post', immediate: true })

function toResult(item: SearchResultItem) {
  void router.push(searchResultRoute(item))
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229 || composing.value)
    return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    event.stopPropagation()
    if (!results.value.length)
      return
    activeIndex.value = event.key === 'ArrowDown'
      ? Math.min(activeIndex.value + 1, results.value.length - 1)
      : Math.max(activeIndex.value - 1, 0)
    resultsSection.value?.querySelectorAll('[data-search-result]')[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
  }
  else if (event.key === 'Enter') {
    event.preventDefault()
    const selected = results.value[activeIndex.value]
    if (selected)
      toResult(selected)
    else
      submitSearch()
  }
}

watch(results, () => activeIndex.value = -1)
onBeforeUnmount(() => clearTimeout(inputTimer))
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <PageHeader title="搜索" />
    <form class="flex items-center gap-3 rounded-xl bg-black/5 dark:bg-white/5 px-4 py-3" role="search" @submit.prevent="submitSearch">
      <LucideSearch class="size-5 text-gray-400 shrink-0" />
      <input
        v-model="keyword"
        type="search"
        aria-label="搜索关键词"
        placeholder="搜索歌曲、专辑、游戏、艺术家..."
        class="min-w-0 flex-1 text-base outline-none bg-transparent placeholder-gray-400"
        @compositionstart="composing = true"
        @compositionend="composing = false"
        @keydown="onInputKeydown"
      >
      <AppButton type="submit" size="sm" variant="primary">
        搜索
      </AppButton>
    </form>
    <FilterChips :model-value="searchType" :options="searchTypeOptions" class="my-4" aria-label="搜索类型" @update:model-value="setType" />

    <section ref="resultsSection" :aria-busy="isFetching || isTyping" aria-label="搜索结果" class="rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden">
      <div v-if="isTyping || (isFetching && !data)" class="flex items-center justify-center py-16 text-gray-400" role="status">
        <LucideLoader2 class="size-5 animate-spin mr-2" />搜索中...
      </div>
      <div v-else-if="!queryKeyword" class="py-16 text-center text-gray-400">
        输入关键词开始搜索
      </div>
      <div v-else-if="isError" class="py-16 text-center text-red-500" role="alert">
        <p>搜索失败：{{ error?.message ?? '未知错误' }}</p>
        <AppButton variant="ghost" size="sm" class="mt-3" @click="refetch()">
          重试
        </AppButton>
      </div>
      <div v-else-if="!results.length" class="py-16 text-center text-gray-400">
        未找到相关结果
      </div>
      <div v-else class="py-2">
        <SearchResultRow v-for="(item, index) in results" :key="`${item.type}-${item.id}`" :item="item" :active="activeIndex === index" @select="toResult" @mouseenter="activeIndex = index" />
      </div>
    </section>

    <nav v-if="!isTyping && !isError && pagination && pagination.totalPages > 1" class="flex flex-wrap justify-center items-center gap-1 mt-5" aria-label="搜索分页">
      <AppButton icon-only size="sm" variant="ghost" aria-label="上一页" :disabled="page <= 1 || isFetching" @click="setPage(page - 1)">
        <LucideChevronLeft class="size-4" />
      </AppButton>
      <template v-for="(value, index) in pages" :key="value">
        <span v-if="index > 0 && value - pages[index - 1]! > 1" class="text-gray-400 px-1">…</span>
        <AppButton size="sm" :variant="value === page ? 'primary' : 'ghost'" :aria-label="`第 ${value} 页`" :aria-current="value === page ? 'page' : undefined" :disabled="isFetching" @click="setPage(value)">
          {{ value }}
        </AppButton>
      </template>
      <AppButton icon-only size="sm" variant="ghost" aria-label="下一页" :disabled="page >= pagination.totalPages || isFetching" @click="setPage(page + 1)">
        <LucideChevronRight class="size-4" />
      </AppButton>
    </nav>
  </div>
</template>

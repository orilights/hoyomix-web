<script setup lang="ts">
import type { SearchResultItem, SearchType } from '@/types/search'
import { useSearchPageQuery } from '@/composables/queries'
import { scrollPageToElement } from '@/composables/usePageScroll'
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { parseSearchType, searchQuery, searchResultRoute, searchTypeOptions } from '@/utils/search'

const route = useRoute()
const router = useRouter()
const queryKeyword = computed(() => typeof route.query.q === 'string' ? route.query.q.trim() : '')
const searchType = computed(() => parseSearchType(route.query.type))
const hasCriteria = computed(() => !!queryKeyword.value)
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

usePageSeo({ title: computed(() => queryKeyword.value ? t('Search.search', { p0: queryKeyword.value }) : t('Header.search')), path: '/search', noindex: true })
const { data, isFetching, isError, error, refetch } = useSearchPageQuery(queryKeyword, searchType, page)
const isTyping = computed(() => keyword.value.trim() !== queryKeyword.value || composing.value)
const results = computed(() => isTyping.value ? [] : data.value?.results ?? [])
const pagination = computed(() => data.value?.pagination)

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
    void router.replace({ name: 'Search', query: searchQuery(keyword.value, searchType.value, 1) })
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
  if (!hasCriteria.value || !response || response.pagination.page !== page.value)
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
    <PageHeader :title="t('Header.search')" />
    <form class="flex items-center gap-3 rounded-xl bg-black/5 dark:bg-white/5 px-4 py-3" role="search" @submit.prevent="submitSearch">
      <LucideSearch class="size-5 text-gray-400 shrink-0" />
      <input
        v-model="keyword"
        type="search"
        :aria-label="t('Search.search_keywords')"
        :placeholder="t('SearchModal.search_songs_albums_games_artists')"
        class="min-w-0 flex-1 text-base outline-none bg-transparent placeholder-gray-400"
        @compositionstart="composing = true"
        @compositionend="composing = false"
        @keydown="onInputKeydown"
      >
      <AppButton type="submit" size="sm" variant="primary">
        {{ t('Header.search') }}
      </AppButton>
    </form>
    <FilterChips :model-value="searchType" :options="searchTypeOptions" class="my-4" :aria-label="t('SearchModal.search_type')" @update:model-value="setType" />

    <section
      ref="resultsSection"
      :aria-busy="isFetching || isTyping"
      :aria-label="t('Search.search_results')"
      class="rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden"
    >
      <AsyncFade>
        <div v-if="isTyping || (isFetching && !data)" class="flex items-center justify-center py-16 text-gray-400" role="status">
          <LucideLoader2 class="size-5 animate-spin mr-2" />{{ t('SearchModal.searching') }}
        </div>
        <div v-else-if="!hasCriteria" class="py-16 text-center text-gray-400">
          {{ t('SearchModal.enter_a_keyword_to_search') }}
        </div>
        <div v-else-if="isError" class="py-16 text-center text-red-500" role="alert">
          <p>{{ t('SearchModal.search_failed', { p0: error?.message ?? t('App.unknown_error') }) }}</p>
          <AppButton variant="ghost" size="sm" class="mt-3" @click="refetch()">
            {{ t('App.retry') }}
          </AppButton>
        </div>
        <div v-else-if="!results.length" class="py-16 text-center text-gray-400">
          {{ t('SearchModal.no_results_found') }}
        </div>
        <div v-else class="py-2">
          <SearchResultRow
            v-for="(item, index) in results"
            :key="`${item.type}-${item.id}`"
            :item="item"
            :active="activeIndex === index"
            @select="toResult"
            @mouseenter="activeIndex = index"
          />
        </div>
      </AsyncFade>
    </section>

    <Pagination
      v-if="!isTyping && !isError && pagination"
      :model-value="page"
      :total-pages="pagination.totalPages"
      :disabled="isFetching"
      :aria-label="t('Search.search_result_pages')"
      class="justify-center mt-5"
      @update:model-value="setPage"
    />
  </div>
</template>

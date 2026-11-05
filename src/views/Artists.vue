<script setup lang="ts">
import { useArtistOverviewQuery } from '@/composables/queries'
import { scrollPageToTop } from '@/composables/usePageScroll'
import { usePageSeo } from '@/composables/usePageSeo'
import { artistPriorityGroups } from '@/constants'
import { t } from '@/i18n'
import { useMainStore } from '@/store/main'

const store = useMainStore()
const { data, isPending, isError, refetch } = useArtistOverviewQuery()
const keyword = ref('')
const product = ref<string | null>(null)
const role = ref<string | null>(null)
const membersOnly = ref(false)
const sort = ref<'name' | 'songCount'>('name')
const page = ref(1)
const pageSize = 100
const roleGroups = artistPriorityGroups.filter(group => group.label !== '制作人')
function matchesGroup(roles: string[], index: number) {
  return roles.some(value => roleGroups[index]!.roles.includes(value))
}

const filteredArtists = computed(() => {
  const query = keyword.value.normalize('NFKC').trim().toLocaleLowerCase()
  return (data.value ?? []).filter(artist =>
    (!product.value || artist.products.includes(product.value))
    && (!membersOnly.value || artist.isHoyomix || artist.isFormerHoyomix)
    && (!query || [artist.name, ...artist.alias].some(name => name.normalize('NFKC').toLocaleLowerCase().includes(query))),
  ).sort((a, b) => Number(b.isHoyomix || b.isFormerHoyomix) - Number(a.isHoyomix || a.isFormerHoyomix) || (sort.value === 'songCount' ? b.songCount - a.songCount : 0) || a.name.localeCompare(b.name, 'zh-CN') || a.id - b.id)
})
const roleOptions = computed(() => [
  { value: null, label: t('search.all'), count: filteredArtists.value.length },
  ...roleGroups.map((group, index) => ({
    value: String(index),
    label: group.label,
    count: filteredArtists.value.filter(artist => matchesGroup(artist.roles, index)).length,
  })),
])
const matchingArtists = computed(() => filteredArtists.value.filter(artist =>
  role.value === null || matchesGroup(artist.roles, Number(role.value)),
))
const totalPages = computed(() => Math.max(1, Math.ceil(matchingArtists.value.length / pageSize)))
const pagedArtists = computed(() => matchingArtists.value.slice((page.value - 1) * pageSize, page.value * pageSize))

watch([keyword, product, role, membersOnly, sort], () => {
  page.value = 1
})
watch(totalPages, (total) => {
  page.value = Math.min(page.value, total)
})

function setPage(value: number) {
  page.value = value
  scrollPageToTop()
}

function resetFilters() {
  keyword.value = ''
  product.value = null
  role.value = null
  membersOnly.value = false
}

usePageSeo({ title: () => t('Artists.title'), path: '/artists', description: () => t('Artists.description') })
onMounted(() => store.setBackground())
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <PageHeader :title="t('Artists.title')" />
    <AsyncFade>
      <PageLoading v-if="isPending" />
      <div v-else-if="isError" class="py-16 text-center space-y-3">
        <p class="text-red-400">
          {{ t('ArtistListByType.unable_to_load_refresh_to_try_again') }}
        </p>
        <AppButton @click="refetch()">
          {{ t('App.retry') }}
        </AppButton>
      </div>
      <div v-else class="space-y-6">
        <div class="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-4">
          <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
            <label class="relative block flex-1 min-w-0">
              <LucideSearch class="absolute left-3 top-3 size-4 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                v-model="keyword" type="search"
                :aria-label="t('Artists.search')" :placeholder="t('Artists.search')"
                class="w-full rounded-xl bg-white/60 dark:bg-black/15 pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              >
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer py-2">
              <input v-model="membersOnly" type="checkbox" class="accent-blue-500">
              {{ t('Artist.hoyomix_member') }}
            </label>
          </div>
          <FilterChips
            v-model="product" :aria-label="t('Artist.projects')"
            :options="[{ value: null, label: t('search.all') }, ...store.productList.map(item => ({ value: item.name, label: item.name }))]"
          />
          <FilterChips v-model="role" :aria-label="t('Artist.roles')" :options="roleOptions" />
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('Artists.sort') }}</span>
            <FilterChips
              v-model="sort" :aria-label="t('Artists.sort')"
              :options="[{ value: 'name', label: t('Artists.by_name') }, { value: 'songCount', label: t('Artists.by_song_count') }]"
            />
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
            {{ t('Artists.count', { count: matchingArtists.length }) }}
          </p>
          <Pagination :model-value="page" :total-pages="totalPages" @update:model-value="setPage" />
        </div>
        <div v-if="!matchingArtists.length" class="py-12 text-center space-y-3">
          <LucideUsersRound class="size-10 mx-auto text-gray-400" aria-hidden="true" />
          <p class="text-gray-500 dark:text-gray-400">
            {{ t('Artists.empty') }}
          </p>
          <AppButton @click="resetFilters">
            {{ t('Artists.reset') }}
          </AppButton>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <RouterLink
            v-for="artist in pagedArtists" :key="artist.id"
            :to="{ name: 'ArtistInfo', params: { name: artist.name } }"
            class="group flex items-start gap-3 p-4 min-w-0 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors focus-visible:outline-blue-400"
          >
            <span class="size-11 shrink-0 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 text-lg font-semibold" aria-hidden="true">
              {{ Array.from(artist.name)[0] }}
            </span>
            <div class="flex-1 min-w-0 space-y-1.5">
              <h3 class="font-semibold break-words [overflow-wrap:anywhere] group-hover:text-blue-500 transition-colors">
                {{ artist.name }}
              </h3>
              <p v-if="artist.isHoyomix || artist.isFormerHoyomix" class="text-xs text-blue-500">
                {{ t(artist.isFormerHoyomix ? 'Artist.former_hoyomix_member' : 'Artist.hoyomix_member') }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 break-words">
                {{ artist.roles.join(' · ') }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 break-words">
                {{ artist.products.join(' / ') }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('Artists.songs', { count: artist.songCount }) }}
              </p>
            </div>
            <LucideChevronRight class="size-4 shrink-0 mt-1 text-gray-400" aria-hidden="true" />
          </RouterLink>
        </div>
        <Pagination :model-value="page" :total-pages="totalPages" class="justify-center" @update:model-value="setPage" />
      </div>
    </AsyncFade>
  </div>
</template>

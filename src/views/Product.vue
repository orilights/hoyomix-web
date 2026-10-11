<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { useMainStore } from '@/store/main'
import { formatDuration, getCoverUrl, getProductIconUrl, getProductName } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useMainStore()

const product = computed(() => route.params.name as string)

const { albumList, productList } = storeToRefs(store)

// 检查产品是否存在，若 productList 已加载且不包含该产品则跳转 404
watch([productList, product], ([list, name]) => {
  if (list && list.length > 0 && !list.some(p => p.name === getProductName(name))) {
    router.replace({ path: '/404', query: { errorMessage: `游戏「${getProductName(name)}」不存在` } })
  }
}, { immediate: true })

const albumsFiltered = computed(() => {
  return albumList.value.filter(i => i.productName === product.value)
})

const albumSeries = computed(() => {
  const counts = new Map<string, number>()
  for (const album of albumsFiltered.value) {
    const names = new Set(album.tags.filter(tag => tag.tagType === 'series' && tag.tagName.trim()).map(tag => tag.tagName))
    for (const name of names)
      counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const prefix = `${getProductName(product.value)}-`
  return Array.from(counts, ([name, count]) => ({
    name,
    displayName: name.startsWith(prefix) ? name.slice(prefix.length) || name : name,
    count,
  }))
})

const selectedSeries = ref<string | null>(null)

function sumBy(arr: any[], getValue: (x: any) => any) {
  return arr.reduce((acc, cur) => acc + getValue(cur), 0)
}

interface VersionRange {
  major: number
  startDate: string
  endDate: string | null
}

const selectedVersion = ref<number | null>(null)

const versionRanges = computed<VersionRange[]>(() => {
  const productInfo = productList.value.find(p => p.name === getProductName(product.value))
  if (!productInfo)
    return []
  const versionTag = productInfo.tags.find(t => t.tagType === 'filter' && t.tagName === 'version')
  if (!versionTag?.tagData || !Array.isArray(versionTag.tagData))
    return []

  const majorMap = new Map<number, { startDate: string, endDate: string | null }>()
  for (const v of versionTag.tagData as { name: string, startDate: string, endDate: string | null }[]) {
    const major = Number.parseInt(v.name)
    if (Number.isNaN(major))
      continue
    const existing = majorMap.get(major)
    if (!existing) {
      majorMap.set(major, { startDate: v.startDate, endDate: v.endDate })
    }
    else {
      if (v.startDate < existing.startDate)
        existing.startDate = v.startDate
      if (existing.endDate !== null) {
        if (v.endDate === null || v.endDate > existing.endDate)
          existing.endDate = v.endDate
      }
    }
  }

  return Array.from(majorMap.entries(), ([major, range]) => ({ major, ...range }))
    .sort((a, b) => b.major - a.major)
})

function getVersionLabel(major: number): string {
  if (product.value === '原神' && major === 6)
    return '空月之歌'
  return `${major}.x`
}

const selectedYear = ref<number | null>(null)

const availableYears = computed(() => {
  const set = new Set<number>()
  for (const album of albumsFiltered.value) {
    set.add(new Date(album.publishDate).getFullYear())
  }
  return [...set].sort((a, b) => b - a)
})

const albumsFilteredBySeries = computed(() => {
  if (selectedSeries.value === null)
    return albumsFiltered.value
  return albumsFiltered.value.filter(album => album.tags.some(tag => tag.tagType === 'series' && tag.tagName === selectedSeries.value))
})

const albumsFilteredByVersion = computed(() => {
  if (selectedVersion.value === null)
    return albumsFilteredBySeries.value
  const range = versionRanges.value.find(r => r.major === selectedVersion.value)
  if (!range)
    return albumsFilteredBySeries.value
  // 最小主版本号——该版本之前发布的专辑归属于它
  const minMajor = Math.min(...versionRanges.value.map(r => r.major))
  return albumsFilteredBySeries.value.filter((a) => {
    if (range.major === minMajor && a.publishDate < range.startDate)
      return true
    return a.publishDate >= range.startDate && (range.endDate === null || a.publishDate <= range.endDate)
  })
})

const albumsFilteredByYear = computed(() => {
  if (selectedYear.value === null)
    return albumsFilteredByVersion.value
  return albumsFilteredByVersion.value.filter(
    a => new Date(a.publishDate).getFullYear() === selectedYear.value,
  )
})

watch(product, () => {
  selectedSeries.value = null
  selectedYear.value = null
  selectedVersion.value = null
})

const activeTab = ref<'albums' | 'artists'>('albums')

usePageSeo({
  title: computed(() => (product.value ? getProductName(product.value) : null)),
  description: computed(() => {
    if (!product.value)
      return null
    return `${getProductName(product.value)}专辑列表`
  }),
  path: computed(() => (product.value ? `/product/${product.value}` : null)),
})

watch(product, (val) => {
  if (val) {
    if (albumsFiltered.value[0])
      store.setBackground(getCoverUrl(albumsFiltered.value[0].platforms, '128px'))
  }
}, { immediate: true })
</script>

<template>
  <div>
    <div class="py-4 flex items-center">
      <LazyImg class="size-[100px] md:size-[136px] rounded-full shadow" :src="getProductIconUrl(product)" />
      <div class="ml-4 md:ml-8">
        <div class="font-bold text-2xl md:text-3xl">
          {{ getProductName(product) }}
        </div>
        <div class="mt-2 md:mt-6">
          <span class="text-gray-500 dark:text-gray-400">
            专辑
          </span>
          <span>
            {{ albumsFiltered.length }}
          </span>
          <span class="ml-4 text-gray-500 dark:text-gray-400">
            歌曲
          </span>
          <span>
            {{ sumBy(albumsFiltered, (i) => i.songCount) }}
          </span>
          <span class="ml-4 text-gray-500 dark:text-gray-400">
            时长
          </span>
          <span>
            {{ formatDuration(sumBy(albumsFiltered, (i) => Number(i.totalDuration))) }}
          </span>
        </div>
      </div>
    </div>

    <SegmentSwitch
      v-model="activeTab"
      :options="[{ key: 'albums', label: '专辑列表' }, { key: 'artists', label: '制作人员' }]"
      class="mt-4 lg:hidden h-fit"
      aria-label="游戏内容"
    />

    <div class="flex flex-col lg:flex-row gap-4 mt-4">
      <div v-show="activeTab === 'artists'" class="w-full lg:w-[400px] shrink-0 p-4 bg-black/5 dark:bg-white/5 rounded-xl lg:!block" :class="{ hidden: activeTab !== 'artists' }">
        <ArtistListByType :id="product" type="product" />
      </div>

      <div v-show="activeTab === 'albums'" class="flex-1 lg:!block overflow-hidden" :class="{ hidden: activeTab !== 'albums' }">
        <section v-if="albumSeries.length" class="mb-2">
          <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            专辑系列
          </h2>
          <FilterChips
            v-model="selectedSeries"
            :options="[{ value: null, label: '全部' }, ...albumSeries.map(series => ({ value: series.name, label: series.displayName, title: series.displayName, count: series.count }))]"
            aria-label="专辑系列筛选"
          />
        </section>

        <section v-if="versionRanges.length > 0" class="mb-2">
          <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            版本
          </h2>
          <FilterChips
            v-model="selectedVersion"
            :options="[{ value: null, label: '全部' }, ...versionRanges.map(range => ({ value: range.major, label: getVersionLabel(range.major) }))]"
            aria-label="版本筛选"
          />
        </section>

        <section class="mb-2">
          <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            年份
          </h2>
          <FilterChips
            v-model="selectedYear"
            :options="[{ value: null, label: '全部' }, ...availableYears.map(year => ({ value: year, label: String(year) }))]"
            aria-label="年份筛选"
          />
        </section>

        <AlbumList default-layout="list" :albums-list="albumsFilteredByYear" persist-key="product">
          <template #toolbar>
            <span class="text-sm text-gray-400 pl-1">
              专辑 {{ albumsFilteredByYear.length }} · 歌曲 {{ sumBy(albumsFilteredByYear, (i) => i.songCount) }} · 时长 {{ formatDuration(sumBy(albumsFilteredByYear, (i) => Number(i.totalDuration))) }}
            </span>
          </template>
        </AlbumList>
        <div v-if="albumsFiltered.length && !albumsFilteredByYear.length" role="status" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          暂无符合条件的专辑
        </div>
      </div>
    </div>
  </div>
</template>

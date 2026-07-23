<script setup lang="ts">
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

const albumsFilteredByVersion = computed(() => {
  if (selectedVersion.value === null)
    return albumsFiltered.value
  const range = versionRanges.value.find(r => r.major === selectedVersion.value)
  if (!range)
    return albumsFiltered.value
  // 最小主版本号——该版本之前发布的专辑归属于它
  const minMajor = Math.min(...versionRanges.value.map(r => r.major))
  return albumsFiltered.value.filter((a) => {
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
  selectedYear.value = null
  selectedVersion.value = null
})

const activeTab = ref<'albums' | 'artists'>('albums')

watch(product, (val) => {
  if (val) {
    document.title = `${getProductName(val)} - HOYO-MiX Online`

    if (albumsFiltered.value[0])
      store.setBackground(getCoverUrl(albumsFiltered.value[0].platforms, '128px'))
  }
}, { immediate: true })
</script>

<template>
  <div>
    <div class="py-4 flex items-center">
      <img :src="getProductIconUrl(product)" class="rounded-full shadow">
      <div class="ml-4 md:ml-8">
        <div class="font-bold text-2xl md:text-3xl">
          {{ getProductName(product) }}
        </div>
        <div class="mt-2 md:mt-6">
          <span class="text-gray-500">
            专辑
          </span>
          <span>
            {{ albumsFiltered.length }}
          </span>
          <span class="ml-4 text-gray-500">
            音乐
          </span>
          <span>
            {{ sumBy(albumsFiltered, (i) => i.songCount) }}
          </span>
          <span class="ml-4 text-gray-500">
            时长
          </span>
          <span>
            {{ formatDuration(sumBy(albumsFiltered, (i) => Number(i.totalDuration))) }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex gap-2 mt-4 lg:hidden h-fit">
      <button
        class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        :class="activeTab === 'albums' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="activeTab = 'albums'"
      >
        专辑列表
      </button>
      <button
        class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        :class="activeTab === 'artists' ? 'bg-blue-500/90 text-white' : 'bg-black/5'"
        @click="activeTab = 'artists'"
      >
        制作人员
      </button>
    </div>

    <div class="flex flex-col lg:flex-row gap-4 mt-4">
      <div v-show="activeTab === 'artists'" class="w-full lg:w-[400px] shrink-0 p-4 bg-black/5 rounded-xl lg:!block" :class="{ hidden: activeTab !== 'artists' }">
        <ArtistListByType :id="product" type="product" />
      </div>

      <div v-show="activeTab === 'albums'" class="flex-1 lg:!block overflow-hidden" :class="{ hidden: activeTab !== 'albums' }">
        <div v-if="versionRanges.length > 0" class="flex flex-wrap items-center gap-2 mb-2">
          <button
            class="text-sm px-3 py-1 rounded-lg transition-colors cursor-pointer"
            :class="selectedVersion === null ? 'bg-blue-500/90 text-white' : 'bg-black/5 hover:bg-black/10'"
            @click="selectedVersion = null"
          >
            全部
          </button>
          <button
            v-for="range in versionRanges"
            :key="range.major"
            class="text-sm px-3 py-1 rounded-lg transition-colors cursor-pointer"
            :class="selectedVersion === range.major ? 'bg-blue-500/90 text-white' : 'bg-black/5 hover:bg-black/10'"
            @click="selectedVersion = range.major"
          >
            {{ getVersionLabel(range.major) }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2 mb-2">
          <button
            class="text-sm px-3 py-1 rounded-lg transition-colors cursor-pointer"
            :class="selectedYear === null ? 'bg-blue-500/90 text-white' : 'bg-black/5 hover:bg-black/10'"
            @click="selectedYear = null"
          >
            全部
          </button>
          <button
            v-for="year in availableYears"
            :key="year"
            class="text-sm px-3 py-1 rounded-lg transition-colors cursor-pointer"
            :class="selectedYear === year ? 'bg-blue-500/90 text-white' : 'bg-black/5 hover:bg-black/10'"
            @click="selectedYear = year"
          >
            {{ year }}
          </button>
        </div>

        <AlbumList default-layout="list" :albums-list="albumsFilteredByYear" persist-key="product">
          <template #toolbar>
            <span class="text-sm text-gray-400 pl-1">
              专辑 {{ albumsFilteredByYear.length }} · 歌曲 {{ sumBy(albumsFilteredByYear, (i) => i.songCount) }} · 时长 {{ formatDuration(sumBy(albumsFilteredByYear, (i) => Number(i.totalDuration))) }}
            </span>
          </template>
        </AlbumList>
      </div>
    </div>
  </div>
</template>

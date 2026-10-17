<script setup lang="ts">
import type { PlaylistSongItem } from '@/types/core'
import { useMediaQuery } from '@vueuse/core'
import { toast } from 'vue-sonner'
import SongListPlaybackDialog from '@/components/SongListPlaybackDialog.vue'
import { useMapPlaybackQuery, useMapSongsQuery, useMapTreeQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { useMainStore } from '@/store/main'
import { buildRegionIndex } from '@/utils/regions'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const games = [{ value: 'genshin', label: '原神' }]
const game = computed(() => typeof route.query.game === 'string' ? route.query.game : 'genshin')
const supported = computed(() => game.value === 'genshin')
const regionId = computed(() => {
  const value = route.query.region
  return typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null
})
const page = computed(() => {
  const value = Number(route.query.page ?? 1)
  return Number.isInteger(value) && value > 0 && value <= 100000 ? value : 1
})
const includeChildren = computed(() => route.query.children !== 'false')
const treeQuery = useMapTreeQuery(game, supported, true)
const tree = computed(() => treeQuery.data.value ?? [])
const index = computed(() => buildRegionIndex(tree.value))
const selection = computed(() => regionId.value === null ? undefined : index.value.get(regionId.value))
const validId = computed(() => supported.value && selection.value ? regionId.value : null)
const params = computed(() => ({ game: game.value, includeChildren: includeChildren.value, page: page.value }))
const songsQuery = useMapSongsQuery(validId, params)
const songs = computed(() => songsQuery.data.value?.items ?? [])
const songsById = computed(() => new Map(songs.value.map(song => [song.songId, song])))
const total = computed(() => songsQuery.data.value?.total ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 50)))
const keyword = ref('')
const expanded = ref(new Set<number>())
const showRegions = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)')
const playback = useTemplateRef('playback')
const playbackQuery = useMapPlaybackQuery()
const playbackBusy = computed(() => playbackQuery.isPending.value)

usePageSeo({ title: computed(() => selection.value ? `${selection.value.node.name} - 地区` : '地区'), description: '按地区查找游戏音乐', path: '/map' })
registerSongList({ songIds: computed(() => songs.value.map(song => song.songId)) })
onMounted(() => store.setBackground())
watch(isDesktop, (value) => {
  if (value)
    showRegions.value = false
})
watch(songsQuery.data, (data) => {
  if (!data || data.page !== page.value)
    return
  const lastPage = Math.max(1, Math.ceil(data.total / data.limit))
  if (data.page > lastPage)
    void router.replace({ query: { ...route.query, page: lastPage === 1 ? undefined : String(lastPage) } })
})

function selectGame(value: string) {
  if (value === game.value)
    return
  keyword.value = ''
  expanded.value = new Set()
  void router.push({ name: 'Regions', query: { game: value } })
}

function selectRegion(id: number) {
  showRegions.value = false
  if (id === regionId.value)
    return
  void router.push({ name: 'Regions', query: { game: game.value, region: String(id), children: String(includeChildren.value) } })
}

function setChildren(value: boolean) {
  void router.push({ query: { ...route.query, children: String(value), page: undefined } })
}

function setPage(value: number) {
  void router.push({ query: { ...route.query, page: value === 1 ? undefined : String(value) } })
}

const loadPlaybackSongs = computed(() => {
  const scope = validId.value === null ? null : { id: validId.value, game: game.value, includeChildren: includeChildren.value }
  return async (): Promise<PlaylistSongItem[]> => scope ? (await playbackQuery.mutateAsync(scope)).songs : []
})

async function playAll() {
  if (!songs.value.length)
    return
  try {
    const all = await loadPlaybackSongs.value()
    const first = all[0]
    if (!first)
      return
    playback.value?.play({ songId: first.songId, loadSong: async () => first, loadSongs: async () => all })
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '歌曲加载失败')
  }
}
</script>

<template>
  <div>
    <PageHeader title="地区" subtitle="根据地区检索歌曲" />
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <span class="text-sm text-gray-500 dark:text-gray-400">游戏</span>
      <FilterChips :model-value="game" :options="games" @update:model-value="selectGame" />
      <AppButton v-if="!isDesktop && supported" class="ml-auto" @click="showRegions = true">
        <LucideListTree class="size-4" />选择地区
      </AppButton>
    </div>

    <div v-if="!supported" class="py-12 text-center text-gray-500 dark:text-gray-400">
      该游戏暂未开放地区浏览
    </div>
    <div v-else class="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
      <aside v-if="isDesktop" class="min-w-0" aria-label="地区目录">
        <div class="sticky top-0 bg-black/5 dark:bg-white/5 rounded-xl p-3">
          <h2 class="text-sm font-medium px-1 mb-3">
            地区目录
          </h2>
          <div v-if="treeQuery.isPending.value" class="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
            <LucideLoaderCircle class="size-4 animate-spin" />加载中...
          </div>
          <div v-else-if="treeQuery.isError.value" class="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
            <p>地区加载失败</p><AppButton size="sm" class="mt-3" @click="treeQuery.refetch()">
              重试
            </AppButton>
          </div>
          <OverlayScrollbarsComponent v-else class="-mr-3 max-h-[calc(100dvh-300px)]" :options="{ overflow: { x: 'hidden', y: 'scroll' }, scrollbars: { theme: 'os-theme-custom', autoHide: 'leave' } }" defer>
            <RegionTree v-model:keyword="keyword" v-model:expanded="expanded" class="pr-3" :tree="tree" :selected-id="regionId" @select="selectRegion" />
          </OverlayScrollbarsComponent>
        </div>
      </aside>
      <section class="min-w-0" aria-label="地区歌曲">
        <template v-if="selection">
          <nav class="flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-3" aria-label="地区路径">
            <template v-for="(part, i) in selection.path" :key="part.id">
              <LucideChevronRight v-if="i" class="size-3 shrink-0" />
              <button type="button" class="rounded hover:text-blue-500 transition-colors cursor-pointer" :aria-current="part.id === regionId ? 'location' : undefined" @click="selectRegion(part.id)">
                {{ part.name }}
              </button>
            </template>
          </nav>
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <h2 class="text-xl font-bold">
              {{ selection.node.name }}
            </h2>
            <span v-if="songsQuery.isSuccess.value" class="text-sm text-gray-500 dark:text-gray-400">{{ total }} 首歌曲</span>
            <label class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ml-auto cursor-pointer">
              <input type="checkbox" class="accent-blue-500" :checked="includeChildren" @change="setChildren(($event.target as HTMLInputElement).checked)">包含子地区
            </label>
            <AppButton variant="primary" :disabled="!songs.length || songsQuery.isFetching.value || playbackBusy" @click="playAll">
              <LucidePlay class="size-4" fill="currentColor" />播放全部
            </AppButton>
          </div>
          <div v-if="songsQuery.isPending.value" class="flex items-center justify-center gap-2 py-12 text-gray-400">
            <LucideLoaderCircle class="size-5 animate-spin" />加载中...
          </div>
          <div v-else-if="songsQuery.isError.value" class="py-12 text-center text-gray-500 dark:text-gray-400">
            <p>歌曲加载失败</p><AppButton class="mt-3" @click="songsQuery.refetch()">
              重试
            </AppButton>
          </div>
          <template v-else>
            <SongList :songs="songs" show-cover show-album :load-playback-songs="loadPlaybackSongs" empty-text="该地区暂无关联歌曲">
              <template #song-description="{ song }">
                <div v-if="songsById.get(song.songId)?.matchedRegions.length" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <p v-for="match in songsById.get(song.songId)?.matchedRegions" :key="match.id" class="mt-1 whitespace-normal break-words">
                    {{ match.path.join(' / ') }}<span v-if="match.note"> · {{ match.note }}</span>
                  </p>
                </div>
              </template>
            </SongList>
            <div v-if="pageCount > 1 || page > 1" class="flex items-center justify-center gap-3 mt-4">
              <AppButton :disabled="page <= 1" @click="setPage(page - 1)">
                上一页
              </AppButton>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ page }} / {{ pageCount }}</span>
              <AppButton :disabled="page >= pageCount" @click="setPage(page + 1)">
                下一页
              </AppButton>
            </div>
          </template>
        </template>
        <div v-else class="py-16 text-center text-gray-500 dark:text-gray-400">
          <LucideMapPin class="size-8 mx-auto mb-3 text-gray-400" />
          <p>{{ route.query.region && !treeQuery.isPending.value && !treeQuery.isError.value ? '该地区不可用' : '选择一个地区' }}</p>
          <AppButton v-if="!isDesktop" class="mt-4" @click="showRegions = true">
            选择地区
          </AppButton>
        </div>
      </section>
    </div>

    <AppDialog v-model="showRegions" title="选择地区" size="md">
      <OverlayScrollbarsComponent class="max-h-[65dvh]" :options="{ overflow: { x: 'hidden', y: 'scroll' }, scrollbars: { theme: 'os-theme-custom', autoHide: 'leave' } }" defer>
        <div class="p-4">
          <div v-if="treeQuery.isPending.value" class="py-8 text-center text-gray-400">
            加载中...
          </div>
          <div v-else-if="treeQuery.isError.value" class="text-center py-6 text-gray-500 dark:text-gray-400">
            <p>地区加载失败</p><AppButton class="mt-3" @click="treeQuery.refetch()">
              重试
            </AppButton>
          </div>
          <RegionTree v-else v-model:keyword="keyword" v-model:expanded="expanded" :tree="tree" :selected-id="regionId" @select="selectRegion" />
        </div>
      </OverlayScrollbarsComponent>
    </AppDialog>
    <SongListPlaybackDialog ref="playback" />
  </div>
</template>

<script setup lang="ts">
import type { MapSongsSort, PlaylistSongItem } from '@/types/core'
import { useMediaQuery } from '@vueuse/core'

import { toast } from 'vue-sonner'
import SongListPlaybackDialog from '@/components/SongListPlaybackDialog.vue'
import { useMapPlaybackQuery, useMapSongsQuery, useMapTreeQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { t } from '@/i18n'
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
const sortOptions: { value: MapSongsSort, label: string }[] = [
  { value: 'region', get label() {
    return t('Regions.region_order')
  } },
  { value: 'album_asc', get label() {
    return t('Regions.album_release_oldest_first')
  } },
  { value: 'album_desc', get label() {
    return t('Regions.album_release_newest_first')
  } },
]
const sort = computed<MapSongsSort>(() => sortOptions.find(option => option.value === store.regionSongsSort)?.value ?? 'region')
const sortLabel = computed(() => sortOptions.find(option => option.value === sort.value)!.label)
const sortMenu = computed(() => sortOptions.map(option => ({ label: option.label, onClick: () => setSort(option.value) })))
const treeQuery = useMapTreeQuery(game, supported, true)
const tree = computed(() => treeQuery.data.value ?? [])
const index = computed(() => buildRegionIndex(tree.value))
const selection = computed(() => regionId.value === null ? undefined : index.value.get(regionId.value))
const validId = computed(() => supported.value && selection.value ? regionId.value : null)
const params = computed(() => ({ game: game.value, includeChildren: includeChildren.value, page: page.value, sort: sort.value }))
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

usePageSeo({ title: computed(() => selection.value ? t('Regions.regions', { p0: selection.value.node.name }) : t('DesktopSidebar.regions')), description: () => t('Regions.find_game_music_by_region'), path: '/map' })
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

function setSort(value: MapSongsSort) {
  if (value === sort.value)
    return
  store.regionSongsSort = value
}

function setChildren(value: boolean) {
  void router.push({ query: { ...route.query, children: String(value), page: undefined } })
}

function setPage(value: number) {
  void router.push({ query: { ...route.query, page: value === 1 ? undefined : String(value) } })
}

const loadPlaybackSongs = computed(() => {
  const scope = validId.value === null ? null : { id: validId.value, game: game.value, includeChildren: includeChildren.value, sort: sort.value }
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
    toast.error(error instanceof Error ? error.message : t('Regions.failed_to_load_songs'))
  }
}
</script>

<template>
  <div>
    <PageHeader :title="t('DesktopSidebar.regions')" :subtitle="t('Home.find_songs_by_region')" />
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('search.game') }}</span>
      <FilterChips :model-value="game" :options="games" @update:model-value="selectGame" />
      <AppButton v-if="!isDesktop && supported" class="ml-auto" @click="showRegions = true">
        <LucideListTree class="size-4" />{{ t('SongRegionEditDialog.select_regions') }}
      </AppButton>
    </div>

    <div v-if="!supported" class="py-12 text-center text-gray-500 dark:text-gray-400">
      {{ t('Regions.region_browsing_is_not_available_for_this_game') }}
    </div>
    <div v-else class="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
      <aside v-if="isDesktop" class="min-w-0" :aria-label="t('Regions.region_directory')">
        <div class="sticky top-0 bg-black/5 dark:bg-white/5 rounded-xl p-3">
          <h2 class="text-sm font-medium px-1 mb-3">
            {{ t('Regions.region_directory') }}
          </h2>
          <AsyncFade animate-height>
            <div v-if="treeQuery.isPending.value" role="status" class="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <LucideLoaderCircle class="size-4 animate-spin" />{{ t('App.loading') }}
            </div>
            <div v-else-if="treeQuery.isError.value" class="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
              <p>{{ t('Regions.failed_to_load_regions') }}</p><AppButton size="sm" class="mt-3" @click="treeQuery.refetch()">
                {{ t('App.retry') }}
              </AppButton>
            </div>
            <OverlayScrollbarsComponent v-else class="-mr-3 max-h-[calc(100dvh-300px)]" :options="{ overflow: { x: 'hidden', y: 'scroll' }, scrollbars: { theme: 'os-theme-custom', autoHide: 'leave' } }" defer>
              <RegionTree v-model:keyword="keyword" v-model:expanded="expanded" class="pr-3" :tree="tree" :selected-id="regionId" @select="selectRegion" />
            </OverlayScrollbarsComponent>
          </AsyncFade>
        </div>
      </aside>
      <section class="min-w-0" :aria-label="t('Regions.region_songs')">
        <AsyncFade>
          <div v-if="treeQuery.isPending.value" class="flex items-center justify-center gap-2 py-16 text-gray-400" role="status">
            <LucideLoader2 class="size-5 animate-spin" />{{ t('App.loading') }}
          </div>
          <div v-else-if="treeQuery.isError.value" class="py-16 text-center text-gray-400" role="alert">
            {{ t('Regions.failed_to_load_regions') }}<AppButton class="ml-2" @click="treeQuery.refetch()">
              {{ t('App.retry') }}
            </AppButton>
          </div>
          <div v-else-if="selection">
            <nav class="flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-3" :aria-label="t('Regions.region_path')">
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
              <span v-if="songsQuery.isSuccess.value" class="text-sm text-gray-500 dark:text-gray-400">{{ t('Random.song_alternate', { p0: total }, Number(total)) }}</span>
              <Dropdown :options="sortMenu" alignment="right" class="ml-auto">
                <AppButton :aria-label="t('Regions.song_order', { p0: sortLabel })">
                  <LucideMapPinned v-if="sort === 'region'" class="size-4" />
                  <LucideClockArrowUp v-else-if="sort === 'album_asc'" class="size-4" />
                  <LucideClockArrowDown v-else class="size-4" />
                  {{ sortLabel }}<LucideChevronDown class="size-3.5" />
                </AppButton>
              </Dropdown>
              <label class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                <input type="checkbox" class="accent-blue-500" :checked="includeChildren" @change="setChildren(($event.target as HTMLInputElement).checked)">{{ t('Regions.include_subregions') }}</label>
              <AppButton variant="primary" :disabled="!songs.length || songsQuery.isFetching.value || playbackBusy" @click="playAll">
                <LucidePlay class="size-4" fill="currentColor" />{{ t('AlbumActions.play_all') }}
              </AppButton>
            </div>
            <AsyncFade>
              <div v-if="songsQuery.isPending.value" role="status" class="flex items-center justify-center gap-2 py-12 text-gray-400">
                <LucideLoaderCircle class="size-5 animate-spin" />{{ t('App.loading') }}
              </div>
              <div v-else-if="songsQuery.isError.value" class="py-12 text-center text-gray-500 dark:text-gray-400">
                <p>{{ t('Regions.failed_to_load_songs') }}</p><AppButton class="mt-3" @click="songsQuery.refetch()">
                  {{ t('App.retry') }}
                </AppButton>
              </div>
              <div v-else>
                <SongList :songs="songs" show-cover show-album :load-playback-songs="loadPlaybackSongs" :empty-text="t('Regions.no_songs_linked_to_this_region')">
                  <template #song-description="{ song }">
                    <div v-if="songsById.get(song.songId)?.matchedRegions.length" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <p v-for="match in songsById.get(song.songId)?.matchedRegions" :key="match.id" class="mt-1 whitespace-normal break-words">
                        {{ match.path.join(' / ') }}<span v-if="match.note"> · {{ match.note }}</span>
                      </p>
                    </div>
                  </template>
                </SongList>
                <Pagination
                  :model-value="page"
                  :total-pages="pageCount"
                  :disabled="songsQuery.isFetching.value"
                  :aria-label="t('Regions.region_song_pages')"
                  class="justify-center mt-5"
                  @update:model-value="setPage"
                />
              </div>
            </AsyncFade>
          </div>
          <div v-else class="py-16 text-center text-gray-500 dark:text-gray-400">
            <LucideMapPin class="size-8 mx-auto mb-3 text-gray-400" />
            <p>{{ route.query.region && !treeQuery.isPending.value && !treeQuery.isError.value ? t('Regions.region_unavailable') : t('Regions.select_a_region') }}</p>
            <AppButton v-if="!isDesktop" class="mt-4" @click="showRegions = true">
              {{ t('SongRegionEditDialog.select_regions') }}
            </AppButton>
          </div>
        </AsyncFade>
      </section>
    </div>

    <AppDialog v-model="showRegions" :close-on-click-overlay="false" :title="t('SongRegionEditDialog.select_regions')" size="md">
      <OverlayScrollbarsComponent class="max-h-[65dvh]" :options="{ overflow: { x: 'hidden', y: 'scroll' }, scrollbars: { theme: 'os-theme-custom', autoHide: 'leave' } }" defer>
        <div class="p-4">
          <AsyncFade>
            <div v-if="treeQuery.isPending.value" role="status" class="py-8 text-center text-gray-400">
              {{ t('App.loading') }}
            </div>
            <div v-else-if="treeQuery.isError.value" class="text-center py-6 text-gray-500 dark:text-gray-400">
              <p>{{ t('Regions.failed_to_load_regions') }}</p><AppButton class="mt-3" @click="treeQuery.refetch()">
                {{ t('App.retry') }}
              </AppButton>
            </div>
            <RegionTree v-else v-model:keyword="keyword" v-model:expanded="expanded" :tree="tree" :selected-id="regionId" @select="selectRegion" />
          </AsyncFade>
        </div>
      </OverlayScrollbarsComponent>
    </AppDialog>
    <SongListPlaybackDialog ref="playback" />
  </div>
</template>

<script setup lang="ts">
import type { PlaylistItem } from '@/types/player'
import { toast } from 'vue-sonner'
import { useRandomPlaylistQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { registerSongList } from '@/composables/useSongLocator'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { getProductName } from '@/utils'

const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()

usePageSeo({
  title: () => t('DesktopSidebar.shuffle'),
  description: () => t('Home.generate_a_random_queue'),
  path: '/random',
})

const {
  randomPlaylistMode,
  randomPlaylistLimit,
  randomPlaylistMinDuration,
  randomPlaylistProducts,
  randomPlaylistDateFrom,
  randomPlaylistDateTo,
  randomPlaylistExcludeAlbums,
  randomPlaylistExcludeInstrumental,
  randomPlaylistAlbums,
  randomPlaylist,
} = storeToRefs(store)

const { mutateAsync: generatePlaylist, isPending: isLoading } = useRandomPlaylistQuery()
const showExcludeAlbumsDialog = ref(false)
const showAlbumsDialog = ref(false)
const showCreatePlaylistDialog = ref(false)
const showSelectPlaylistDialog = ref(false)

const { productList: appProductList } = storeToRefs(store)

function normalizePlaylistLimit(value: number) {
  return Math.max(10, Math.min(200, Math.round((Number.isFinite(value) ? value : 20) / 5) * 5))
}

watch(randomPlaylistLimit, (value) => {
  const limit = normalizePlaylistLimit(value)
  if (value !== limit)
    randomPlaylistLimit.value = limit
}, { immediate: true })

function normalizeMinDuration(value: number) {
  return Math.max(0, Math.min(120, Math.round((Number.isFinite(value) ? value : 0) / 10) * 10))
}

watch(randomPlaylistMinDuration, (value) => {
  const duration = normalizeMinDuration(value)
  if (value !== duration)
    randomPlaylistMinDuration.value = duration
}, { immediate: true })

const productList = computed(() =>
  appProductList.value.map(p => ({ key: p.alias, name: p.name })),
)

const songIds = computed(() => randomPlaylist.value.map(s => s.songId))
const playlistItems = computed<PlaylistItem[]>(() => randomPlaylist.value as unknown as PlaylistItem[])

registerSongList({ songIds })

function toggleProduct(key: string) {
  const idx = randomPlaylistProducts.value.indexOf(key)
  if (idx === -1)
    randomPlaylistProducts.value.push(key)
  else
    randomPlaylistProducts.value.splice(idx, 1)
}

async function generate() {
  try {
    const limit = normalizePlaylistLimit(randomPlaylistLimit.value)
    randomPlaylistLimit.value = limit
    const minDuration = normalizeMinDuration(randomPlaylistMinDuration.value)
    randomPlaylistMinDuration.value = minDuration

    if (randomPlaylistMode.value === 'album') {
      if (!randomPlaylistAlbums.value.length) {
        toast.warning(t('Random.select_albums_first'))
        return
      }
      randomPlaylist.value = await generatePlaylist({
        limit,
        minDuration,
        albums: randomPlaylistAlbums.value,
      })
    }
    else {
      randomPlaylist.value = await generatePlaylist({
        limit,
        minDuration,
        products: randomPlaylistProducts.value.length ? randomPlaylistProducts.value.map(k => getProductName(k)) : undefined,
        dateFrom: randomPlaylistDateFrom.value || undefined,
        dateTo: randomPlaylistDateTo.value || undefined,
        excludeAlbums: randomPlaylistExcludeAlbums.value.length ? randomPlaylistExcludeAlbums.value : undefined,
        excludeInstrumental: randomPlaylistExcludeInstrumental.value || undefined,
      })
    }
  }
  catch (e: any) {
    toast.error(e.message ?? t('Random.failed_to_generate_queue'))
  }
}

function playAll() {
  if (!playlistItems.value.length)
    return
  player.replacePlaylist(playlistItems.value, 0)
  toast.success(t('AlbumList.queue_replaced'))
}

function addAll() {
  if (!playlistItems.value.length)
    return
  for (const item of playlistItems.value)
    player.addToPlaylist(item)
  toast.success(t('Random.all_songs_added_to_queue'))
}

function saveAsPlaylist() {
  if (!auth.requireLogin())
    return
  showCreatePlaylistDialog.value = true
}

function addToPlaylist() {
  if (!auth.requireLogin())
    return
  showSelectPlaylistDialog.value = true
}

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div>
    <PageHeader :title="t('DesktopSidebar.shuffle')" :subtitle="t('Home.generate_a_random_queue')" />

    <div class="xl:grid xl:grid-cols-[320px_1fr] gap-6">
      <div>
        <SegmentSwitch
          v-model="randomPlaylistMode"
          :options="[{ key: 'random', label: t('Random.random') }, { key: 'album', label: t('Random.selected_albums') }]"
          block
          role="group"
          :aria-label="t('Random.generation_mode')"
        />

        <div class="bg-black/5 dark:bg-white/5 rounded-2xl p-4 space-y-4 mt-4">
          <div>
            <label for="random-playlist-limit" class="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span>{{ t('Album.song_count') }}</span>
              <span class="text-blue-500 dark:text-blue-400 tabular-nums">{{ t('Random.song', { p0: randomPlaylistLimit }, Number(randomPlaylistLimit)) }}</span>
            </label>
            <input
              id="random-playlist-limit"
              v-model.number="randomPlaylistLimit"
              type="range"
              min="10"
              max="200"
              step="5"
              :aria-valuetext="t('Random.song_alternate', { p0: randomPlaylistLimit }, Number(randomPlaylistLimit))"
              class="w-full accent-blue-500 cursor-pointer"
            >
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>{{ t('Random.10_songs') }}</span>
              <span>{{ t('Random.200_songs') }}</span>
            </div>
          </div>

          <template v-if="randomPlaylistMode === 'random'">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('Random.games') }}<span v-if="!randomPlaylistProducts.length" class="text-gray-400 font-normal ml-1">{{ t('Random.all') }}</span>
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="p in productList"
                  :key="p.key"
                  class="px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer"
                  :class="randomPlaylistProducts.includes(p.key)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-[var(--theme-surface)] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'"
                  @click="toggleProduct(p.key)"
                >
                  {{ p.name }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('Random.release_date_range') }}</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div class="min-w-0">
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('Random.from') }}
                  </div>
                  <input
                    v-model="randomPlaylistDateFrom"
                    type="date"
                    class="block w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                </div>
                <div class="min-w-0">
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('Random.to') }}
                  </div>
                  <input
                    v-model="randomPlaylistDateTo"
                    type="date"
                    class="block w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('Random.exclude_albums') }}</label>
              <AppButton
                variant="outline"
                class="w-full !justify-start text-left"
                @click="showExcludeAlbumsDialog = true"
              >
                <LucideListX class="size-4 text-gray-400 shrink-0" />
                <span class="flex-1 text-gray-600 dark:text-gray-400">
                  {{ randomPlaylistExcludeAlbums.length ? t('Random.album_excluded', { p0: randomPlaylistExcludeAlbums.length }, Number(randomPlaylistExcludeAlbums.length)) : t('Random.choose_albums_to_exclude') }}
                </span>
                <LucideChevronRight class="size-4 text-gray-300 shrink-0" />
              </AppButton>
            </div>

            <label class="flex items-center gap-2.5 py-1 cursor-pointer select-none">
              <input
                v-model="randomPlaylistExcludeInstrumental"
                type="checkbox"
                class="size-4 rounded border-gray-300 dark:border-gray-700 text-blue-500 focus:ring-blue-400 accent-blue-500 cursor-pointer"
              >
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('Random.exclude_backing_tracks') }}</span>
            </label>

            <div>
              <label for="random-playlist-min-duration" class="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span>{{ t('Random.minimum_duration') }}</span>
                <span class="text-blue-500 dark:text-blue-400 tabular-nums">{{ randomPlaylistMinDuration === 0 ? t('Random.no_limit') : t('Random.second', { p0: randomPlaylistMinDuration }, Number(randomPlaylistMinDuration)) }}</span>
              </label>
              <input
                id="random-playlist-min-duration"
                v-model.number="randomPlaylistMinDuration"
                type="range"
                min="0"
                max="120"
                step="10"
                :aria-valuetext="randomPlaylistMinDuration === 0 ? t('Random.no_limit') : t('Random.second', { p0: randomPlaylistMinDuration }, Number(randomPlaylistMinDuration))"
                class="w-full accent-blue-500 cursor-pointer"
              >
              <div class="flex justify-between mt-1 text-xs text-gray-400">
                <span>{{ t('Random.no_limit') }}</span>
                <span>{{ t('Random.120_seconds') }}</span>
              </div>
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {{ t('Random.exclude_songs_shorter_than_the_selected_duration') }}
              </p>
            </div>
          </template>

          <template v-else>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('Random.selected_albums') }}</label>
              <AppButton
                variant="outline"
                class="w-full !justify-start text-left"
                :class="!randomPlaylistAlbums.length ? 'border-red-200' : ''"
                @click="showAlbumsDialog = true"
              >
                <LucideDisc class="size-4 text-gray-400 shrink-0" />
                <span class="flex-1" :class="randomPlaylistAlbums.length ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'">
                  {{ randomPlaylistAlbums.length ? t('AlbumPickerDialog.album_selected', { p0: randomPlaylistAlbums.length }, Number(randomPlaylistAlbums.length)) : t('Random.choose_albums_required') }}
                </span>
                <LucideChevronRight class="size-4 text-gray-300 shrink-0" />
              </AppButton>
            </div>
          </template>

          <AppButton
            variant="primary"
            size="lg"
            class="w-full"
            :disabled="isLoading"
            @click="generate"
          >
            <LucideLoader2 v-if="isLoading" class="size-4 animate-spin" />
            <LucideShuffle v-else class="size-4" />
            {{ isLoading ? t('Random.generating') : t('Random.generate_random_queue') }}
          </AppButton>
        </div>
      </div>

      <div class="mt-4 xl:mt-0">
        <AsyncFade>
          <div v-if="isLoading" class="flex items-center justify-center gap-2 py-16 text-gray-400" role="status">
            <LucideLoader2 class="size-5 animate-spin" />{{ t('App.loading') }}
          </div>
          <div v-else>
            <div v-if="randomPlaylist.length" class="mb-4 flex items-center gap-2 flex-wrap">
              <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">{{ t('Random.song_in_total', { p0: randomPlaylist.length }, Number(randomPlaylist.length)) }}</span>
              <AppButton
                variant="primary"
                @click="playAll"
              >
                <LucidePlay class="size-3.5" />{{ t('AlbumActions.play_all') }}
              </AppButton>
              <AppButton
                variant="outline"
                @click="addAll"
              >
                <LucidePlus class="size-3.5" />{{ t('Random.add_to_queue') }}
              </AppButton>
              <AppButton
                variant="outline"
                @click="saveAsPlaylist"
              >
                <LucideListPlus class="size-3.5" />{{ t('DesktopSidebar.new_playlist') }}
              </AppButton>
              <AppButton
                variant="outline"
                @click="addToPlaylist"
              >
                <LucideFolderPlus class="size-3.5" />{{ t('Random.add_to_playlist') }}
              </AppButton>
            </div>
            <SongList
              :songs="randomPlaylist"
              show-cover
              show-album
              :empty-text="t('Random.generate_a_random_queue_to_get_started')"
            >
              <template #empty>
                <div class="flex flex-col items-center justify-center h-44 gap-3">
                  <LucideShuffle class="size-10 opacity-30" />
                  <div>{{ t('Random.generate_a_random_queue_to_get_started') }}</div>
                </div>
              </template>
            </SongList>
          </div>
        </AsyncFade>
      </div>
    </div>

    <AlbumPickerDialog
      v-model="showExcludeAlbumsDialog"
      :selected-ids="randomPlaylistExcludeAlbums"
      :title="t('Random.choose_albums_to_exclude_alternate')"
      @update:selected-ids="(ids: number[]) => (randomPlaylistExcludeAlbums = ids)"
    />
    <AlbumPickerDialog
      v-model="showAlbumsDialog"
      :selected-ids="randomPlaylistAlbums"
      :title="t('AlbumPickerDialog.select_albums')"
      @update:selected-ids="(ids: number[]) => (randomPlaylistAlbums = ids)"
    />
    <CreatePlaylistDialog
      v-model="showCreatePlaylistDialog"
      :initial-song-ids="songIds"
      @success="(id: string) => $router.push({ name: 'PlaylistDetail', params: { id } })"
    />
    <SelectPlaylistDialog
      v-model="showSelectPlaylistDialog"
      :song-ids="songIds"
      mode="add"
    />
  </div>
</template>

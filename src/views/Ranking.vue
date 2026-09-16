<script setup lang="ts">
import type { RankingPeriod } from '@/api/music'
import type { PlaylistSongItem } from '@/types/core'
import { useUrlSearchParams } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { getRankingApi } from '@/api/music'
import { usePageSeo } from '@/composables/usePageSeo'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

const player = usePlayerStore()
const store = useMainStore()

usePageSeo({
  title: '热榜',
  description: '热门歌曲榜单',
  path: '/ranking',
})

const periods: { key: RankingPeriod, label: string }[] = [
  { key: '1d', label: '日榜' },
  { key: '7d', label: '周榜' },
  { key: '30d', label: '月榜' },
  { key: '365d', label: '年榜' },
  { key: 'all', label: '总榜' },
]

const params = useUrlSearchParams('history', { removeFalsyValues: true })
const tab = computed<RankingPeriod>({
  get: () => (params.tab as RankingPeriod) || '1d',
  set: (val) => { params.tab = val },
})
const selectedDate = computed<string>({
  get: () => typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : '',
  set: (val) => { params.date = val },
})
const rankingQueryDate = computed(() => tab.value === 'all' ? '' : selectedDate.value)
const songs = ref<PlaylistSongItem[]>([])
const rankingDate = ref<string | undefined>()
const displayDate = computed({
  get: () => selectedDate.value || rankingDate.value?.slice(0, 10) || '',
  set: (val: string) => { selectedDate.value = val },
})
const isLoading = ref(false)
let requestId = 0

watch([tab, rankingQueryDate], () => {
  fetchRanking()
})

async function fetchRanking() {
  const currentRequest = ++requestId
  isLoading.value = true
  try {
    const res = await getRankingApi(tab.value, rankingQueryDate.value || undefined)
    if (currentRequest !== requestId)
      return
    songs.value = res.songs
    rankingDate.value = res.date
  }
  catch (e: any) {
    if (currentRequest !== requestId)
      return
    toast.error(e.message ?? '加载失败')
    songs.value = []
    rankingDate.value = undefined
  }
  finally {
    if (currentRequest === requestId)
      isLoading.value = false
  }
}

function playAll() {
  if (!songs.value.length)
    return
  player.replacePlaylist(songs.value, 0)
  toast.success('已替换播放列表')
}

function addAllToPlaylist() {
  let addCount = 0
  for (const song of songs.value) {
    const { isNew } = player.addToPlaylist(song)
    if (isNew)
      addCount++
  }
  toast.success(addCount > 0 ? `已添加 ${addCount} 首至播放列表` : '所有歌曲已在播放列表中')
}

function playSong(song: PlaylistSongItem) {
  const { index } = player.addToPlaylist(song)
  player.playSong(index)
  toast.success('已添加至播放列表并播放')
}

function addSongToPlaylist(song: PlaylistSongItem) {
  const { isNew } = player.addToPlaylist(song)
  toast.success(isNew ? '已添加至播放列表' : '歌曲已在播放列表中')
}

onMounted(() => {
  store.setBackground()
  fetchRanking()
})
</script>

<template>
  <div>
    <PageHeader title="热榜" subtitle="看看大家都在听什么" />

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <SegmentSwitch
        v-model="tab"
        :options="periods"
      />
      <label v-if="tab !== 'all'" class="flex items-center gap-2 text-sm text-gray-500">
        榜单日期
        <input
          v-model="displayDate"
          type="date"
          class="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </label>
      <button
        v-if="tab !== 'all' && selectedDate"
        type="button"
        class="text-sm text-blue-500 hover:text-blue-600 cursor-pointer"
        @click="selectedDate = ''"
      >
        返回最新
      </button>
      <div class="flex-1" />
      <div class="flex gap-2">
        <AppButton
          variant="primary"
          :disabled="!songs.length"
          @click="playAll"
        >
          <LucidePlay class="size-4" fill="currentColor" />
          播放全部
        </AppButton>
        <AppButton
          :disabled="!songs.length"
          @click="addAllToPlaylist"
        >
          <LucideListMusic class="size-4" />
          添加全部
        </AppButton>
      </div>
    </div>

    <AsyncFade>
      <div v-if="isLoading" class="flex items-center justify-center py-20 text-gray-400">
        <LucideLoader2 class="size-6 animate-spin mr-2" />
        加载中...
      </div>

      <div v-else-if="!songs.length" class="flex items-center justify-center py-20 text-gray-400">
        暂无数据
      </div>

      <div v-else class="bg-black/5 rounded-xl pt-2 pb-4">
        <table class="w-full table-fixed overflow-hidden">
          <thead>
            <tr class="text-left">
              <th class="pl-4 p-2 w-[50px]">
                #
              </th>
              <th class="p-2 w-[56px]" />
              <th class="p-2">
                歌曲
              </th>
              <th class="p-2 w-[200px] hidden md:table-cell">
                专辑
              </th>
              <th class="p-2 w-[80px]">
                时长
              </th>
              <th class="p-2 w-[100px] hidden md:table-cell" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(song, index) in songs"
              :key="song.songId"
              class="transition-colors hover:bg-black/8 group"
            >
              <td class="pl-4 text-gray-500 text-sm">
                <span
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                  :class="index < 3
                    ? ['text-white', index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400']
                    : ''"
                >
                  {{ index + 1 }}
                </span>
              </td>
              <td class="p-2">
                <LazyImg class="size-10 rounded-md" :src="getCoverUrl(song.albumPlatforms, '96px')" />
              </td>
              <td
                class="p-2 cursor-pointer"
                @click="$router.push({ name: 'MusicInfo', params: { albumId: song.albumId, musicId: song.songId } })"
              >
                <p class="truncate text-sm font-medium" :title="song.songName">
                  {{ song.songName }}
                </p>
                <p class="truncate text-xs text-gray-500">
                  {{ song.songDescription }}
                </p>
              </td>
              <td class="p-2 text-sm text-gray-500 hidden md:table-cell truncate" :title="song.albumName">
                <RouterLink
                  :to="{ name: 'AlbumInfo', params: { id: song.albumId } }"
                  class="hover:text-blue-500 transition-colors"
                  @click.stop
                >
                  {{ song.albumName }}
                </RouterLink>
              </td>
              <td class="p-2 text-sm text-gray-500">
                {{ formatDuration(song.duration) }}
              </td>
              <td class="hidden md:table-cell p-2">
                <div class="flex gap-1">
                  <div
                    v-if="!store.favoriteSongIds.includes(song.songId)"
                    class="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FavoriteButton type="song" :song-id="song.songId" />
                  </div>
                  <FavoriteButton
                    v-else
                    type="song"
                    :song-id="song.songId"
                  />
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AppButton
                      icon-only
                      size="xs"
                      variant="ghost"
                      title="播放"
                      @click="playSong(song)"
                    >
                      <LucidePlay class="size-4" />
                    </AppButton>
                    <AppButton
                      icon-only
                      size="xs"
                      variant="ghost"
                      title="加入播放列表"
                      @click="addSongToPlaylist(song)"
                    >
                      <LucidePlus class="size-4" />
                    </AppButton>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AsyncFade>
  </div>
</template>

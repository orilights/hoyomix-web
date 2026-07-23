<script setup lang="ts">
import type { RankingPeriod } from '@/api/music'
import type { PlaylistSongItem } from '@/types/core'
import { useUrlSearchParams } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { getRankingApi } from '@/api/music'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

const player = usePlayerStore()

const periods: { key: RankingPeriod, label: string }[] = [
  { key: '7d', label: '周榜' },
  { key: '30d', label: '月榜' },
  { key: '365d', label: '年榜' },
  { key: 'all', label: '总榜' },
]

const params = useUrlSearchParams('history', { removeFalsyValues: true })
const tab = computed<RankingPeriod>({
  get: () => (params.tab as RankingPeriod) || '7d',
  set: (val) => { params.tab = val },
})
const songs = ref<PlaylistSongItem[]>([])
const isLoading = ref(false)

watch(tab, () => {
  fetchRanking()
})

async function fetchRanking() {
  isLoading.value = true
  try {
    songs.value = await getRankingApi(tab.value)
  }
  catch (e: any) {
    toast.error(e.message ?? '加载失败')
    songs.value = []
  }
  finally {
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
  document.title = '热榜 - HOYO-MiX Online'
  fetchRanking()
})
</script>

<template>
  <div>
    <PageHeader title="热榜" subtitle="看看大家都在听什么" />

    <div class="flex items-center gap-2 mb-4">
      <SegmentSwitch
        v-model="tab"
        :options="periods"
      />
      <div class="flex-1" />
      <div class="hidden md:flex gap-2">
        <button
          class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
          :disabled="!songs.length"
          @click="playAll"
        >
          <LucidePlay class="size-4" fill="currentColor" />
          播放全部
        </button>
        <button
          class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
          :disabled="!songs.length"
          @click="addAllToPlaylist"
        >
          <LucideListMusic class="size-4" />
          添加全部
        </button>
      </div>
    </div>

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
              <div class="size-10 rounded-md overflow-hidden bg-gray-200 shrink-0">
                <img
                  :src="getCoverUrl(song.albumPlatforms, '96px')"
                  class="size-full object-cover"
                  loading="lazy"
                >
              </div>
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
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                  title="播放"
                  @click="playSong(song)"
                >
                  <LucidePlay class="size-4" />
                </button>
                <button
                  class="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                  title="加入播放列表"
                  @click="addSongToPlaylist(song)"
                >
                  <LucidePlus class="size-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

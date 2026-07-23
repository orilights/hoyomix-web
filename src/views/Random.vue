<script setup lang="ts">
import type { PlaylistItem } from '@/types/player'
import { toast } from 'vue-sonner'
import { getRandomPlaylistApi } from '@/api/music'
import { appTitle, productMap } from '@/constants'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()

const {
  randomPlaylistMode,
  randomPlaylistLimit,
  randomPlaylistProducts,
  randomPlaylistDateFrom,
  randomPlaylistDateTo,
  randomPlaylistExcludeAlbums,
  randomPlaylistAlbums,
  randomPlaylist,
} = storeToRefs(store)

const isLoading = ref(false)
const showExcludeAlbumsDialog = ref(false)
const showAlbumsDialog = ref(false)
const showCreatePlaylistDialog = ref(false)
const showSelectPlaylistDialog = ref(false)

const productList = computed(() =>
  Object.entries(productMap).map(([key, name]) => ({ key, name })),
)

const songIds = computed(() => randomPlaylist.value.map(s => s.songId))
const playlistItems = computed<PlaylistItem[]>(() => randomPlaylist.value as unknown as PlaylistItem[])

function toggleProduct(key: string) {
  const idx = randomPlaylistProducts.value.indexOf(key)
  if (idx === -1)
    randomPlaylistProducts.value.push(key)
  else
    randomPlaylistProducts.value.splice(idx, 1)
}

async function generate() {
  isLoading.value = true
  try {
    const limit = Math.max(1, Math.min(100, randomPlaylistLimit.value || 20))
    randomPlaylistLimit.value = limit

    if (randomPlaylistMode.value === 'album') {
      if (!randomPlaylistAlbums.value.length) {
        toast.warning('请先选择专辑')
        return
      }
      randomPlaylist.value = await getRandomPlaylistApi({
        limit,
        albums: randomPlaylistAlbums.value,
      })
    }
    else {
      randomPlaylist.value = await getRandomPlaylistApi({
        limit,
        products: randomPlaylistProducts.value.length ? randomPlaylistProducts.value.map(k => productMap[k]) : undefined,
        dateFrom: randomPlaylistDateFrom.value || undefined,
        dateTo: randomPlaylistDateTo.value || undefined,
        excludeAlbums: randomPlaylistExcludeAlbums.value.length ? randomPlaylistExcludeAlbums.value : undefined,
      })
    }
  }
  catch (e: any) {
    toast.error(e.message ?? '生成失败')
  }
  finally {
    isLoading.value = false
  }
}

function playAll() {
  if (!playlistItems.value.length)
    return
  player.replacePlaylist(playlistItems.value, 0)
  toast.success('已替换播放列表')
}

function addAll() {
  if (!playlistItems.value.length)
    return
  for (const item of playlistItems.value)
    player.addToPlaylist(item)
  toast.success('已全部添加至播放列表')
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
  document.title = `随机歌单 - ${appTitle}`
  store.setBackground()
})
</script>

<template>
  <div>
    <PageHeader title="随机歌单" subtitle="随机生成播放列表" />

    <div class="xl:grid xl:grid-cols-[320px_1fr] gap-6">
      <div class="bg-white/80 rounded-2xl p-4 space-y-4">
        <div>
          <div class="text-sm font-medium text-gray-700 mb-2">
            生成模式
          </div>
          <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              class="flex-1 py-2 font-medium transition-colors cursor-pointer"
              :class="randomPlaylistMode === 'random' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
              @click="randomPlaylistMode = 'random'"
            >
              随机模式
            </button>
            <button
              class="flex-1 py-2 font-medium transition-colors cursor-pointer border-l border-gray-200"
              :class="randomPlaylistMode === 'album' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
              @click="randomPlaylistMode = 'album'"
            >
              指定专辑
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">歌曲数量</label>
          <input
            v-model.number="randomPlaylistLimit"
            type="number"
            min="1"
            max="100"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
        </div>

        <template v-if="randomPlaylistMode === 'random'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              游戏范围
              <span v-if="!randomPlaylistProducts.length" class="text-gray-400 font-normal ml-1">（全部）</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in productList"
                :key="p.key"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer"
                :class="randomPlaylistProducts.includes(p.key)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'"
                @click="toggleProduct(p.key)"
              >
                {{ p.name }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">发布日期范围</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <div class="text-xs text-gray-400 mb-1">
                  起始
                </div>
                <input
                  v-model="randomPlaylistDateFrom"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
              </div>
              <div>
                <div class="text-xs text-gray-400 mb-1">
                  截止
                </div>
                <input
                  v-model="randomPlaylistDateTo"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">排除专辑</label>
            <button
              class="flex items-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 cursor-pointer transition-colors text-left"
              @click="showExcludeAlbumsDialog = true"
            >
              <LucideListX class="size-4 text-gray-400 shrink-0" />
              <span class="flex-1 text-gray-600">
                {{ randomPlaylistExcludeAlbums.length ? `已排除 ${randomPlaylistExcludeAlbums.length} 张` : '点击选择要排除的专辑' }}
              </span>
              <LucideChevronRight class="size-4 text-gray-300 shrink-0" />
            </button>
          </div>
        </template>

        <template v-else>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">指定专辑</label>
            <button
              class="flex items-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 cursor-pointer transition-colors text-left"
              :class="!randomPlaylistAlbums.length ? 'border-red-200' : ''"
              @click="showAlbumsDialog = true"
            >
              <LucideDisc class="size-4 text-gray-400 shrink-0" />
              <span class="flex-1" :class="randomPlaylistAlbums.length ? 'text-gray-600' : 'text-gray-400'">
                {{ randomPlaylistAlbums.length ? `已选 ${randomPlaylistAlbums.length} 张` : '点击选择专辑（必选）' }}
              </span>
              <LucideChevronRight class="size-4 text-gray-300 shrink-0" />
            </button>
          </div>
        </template>

        <button
          class="w-full py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          :class="isLoading ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'"
          :disabled="isLoading"
          @click="generate"
        >
          <LucideLoader2 v-if="isLoading" class="size-4 animate-spin" />
          <LucideShuffle v-else class="size-4" />
          {{ isLoading ? '生成中...' : '生成随机歌单' }}
        </button>
      </div>

      <div class="bg-white/80 rounded-2xl overflow-hidden mt-4 xl:mt-0">
        <div
          v-if="!randomPlaylist.length"
          class="flex flex-col items-center justify-center h-64 text-gray-400 gap-3"
        >
          <LucideShuffle class="size-10 opacity-30" />
          <div class="text-sm">
            点击生成按钮获取随机歌单
          </div>
        </div>

        <template v-else>
          <div class="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <span class="text-sm text-gray-500 mr-1">共 {{ randomPlaylist.length }} 首</span>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 cursor-pointer transition-colors"
              @click="playAll"
            >
              <LucidePlay class="size-3.5" />
              播放全部
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              @click="addAll"
            >
              <LucidePlus class="size-3.5" />
              添加到播放列表
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              @click="saveAsPlaylist"
            >
              <LucideListPlus class="size-3.5" />
              新建歌单
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              @click="addToPlaylist"
            >
              <LucideFolderPlus class="size-3.5" />
              添加到歌单
            </button>
          </div>

          <div class="divide-y divide-gray-50">
            <div
              v-for="(song, index) in randomPlaylist"
              :key="song.songId"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <div class="w-6 text-center text-sm text-gray-400 shrink-0 tabular-nums">
                {{ index + 1 }}
              </div>
              <div class="size-10 rounded-lg overflow-hidden shrink-0">
                <CoverImage :src="getCoverUrl(song.albumPlatforms, '96px')" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">
                  {{ song.songName }}
                </div>
                <div class="text-xs text-gray-400 truncate mt-0.5">
                  {{ song.albumName }}
                </div>
              </div>
              <div class="text-xs text-gray-400 shrink-0 tabular-nums">
                {{ formatDuration(song.duration) }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <AlbumPickerDialog
      v-model="showExcludeAlbumsDialog"
      :selected-ids="randomPlaylistExcludeAlbums"
      title="选择排除专辑"
      @update:selected-ids="(ids: number[]) => (randomPlaylistExcludeAlbums = ids)"
    />
    <AlbumPickerDialog
      v-model="showAlbumsDialog"
      :selected-ids="randomPlaylistAlbums"
      title="选择专辑"
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

<script setup lang="ts">
import type { AlbumListItemInfo } from '@/types/core'
import { useElementSize } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { getAlbumInfoApi } from '@/api/music'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'
import { buildPlaylistFromAlbum } from '@/utils/player-utils'

type LayoutMode = 'grid' | 'list'

const props = withDefaults(defineProps<{
  albumsList: AlbumListItemInfo[]
  displayByYear?: boolean
  defaultLayout?: LayoutMode
  showLayoutToggle?: boolean
  persistKey?: string
}>(), {
  displayByYear: false,
  defaultLayout: 'grid',
  showLayoutToggle: true,
})

const store = useMainStore()

// 无 persistKey 时用本地状态
const _localLayout = ref<LayoutMode>(props.defaultLayout)
const layout = computed<LayoutMode>({
  get() {
    if (props.persistKey) {
      return store.albumLayoutMap[props.persistKey] ?? props.defaultLayout
    }
    return _localLayout.value
  },
  set(val: LayoutMode) {
    if (props.persistKey) {
      store.setAlbumLayout(props.persistKey, val)
    }
    else {
      _localLayout.value = val
    }
  },
})

const player = usePlayerStore()
const homeContainer = useTemplateRef<HTMLElement>('homeContainer')
const { width: containerWidth } = useElementSize(homeContainer)

const sortOrder = ref<'asc' | 'desc'>('desc')

const sortedAlbumsList = computed(() => {
  return [...props.albumsList].sort((a, b) => {
    const diff = new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
    return sortOrder.value === 'desc' ? -diff : diff
  })
})

const years = computed(() => {
  if (!props.displayByYear) {
    return [0]
  }
  const set = new Set<number>()
  for (const album of sortedAlbumsList.value) {
    set.add(getAlbumYear(album))
  }
  return [...set].sort((a, b) => sortOrder.value === 'desc' ? b - a : a - b)
})
const gridColumns = computed(() => {
  const num = Math.floor(containerWidth.value / 200)
  if (num < 2)
    return 2
  return num
})

function getAlbumYear(album: AlbumListItemInfo) {
  return new Date(album.publishDate).getFullYear()
}

async function playAlbum(albumId: number) {
  try {
    const album = await getAlbumInfoApi(albumId)
    player.replacePlaylist(buildPlaylistFromAlbum(album), 0)
    toast.success('已替换播放列表')
  }
  catch (error) {
    toast.error(`获取专辑信息失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
}
</script>

<template>
  <div ref="homeContainer" class="relative">
    <div v-if="showLayoutToggle || $slots.toolbar" class="flex items-center gap-2 mb-2">
      <div class="flex-1 min-w-0">
        <slot name="toolbar" />
      </div>
      <div v-if="showLayoutToggle" class="flex gap-1 shrink-0">
        <Tooltip :content="sortOrder === 'desc' ? '发布日期：降序' : '发布日期：升序'" placement="top" align="center">
          <button
            class="p-1.5 rounded-lg transition-colors cursor-pointer text-gray-400 hover:bg-gray-500/15"
            @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
          >
            <LucideArrowDownWideNarrow v-if="sortOrder === 'desc'" class="w-4 h-4" />
            <LucideArrowUpNarrowWide v-else class="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip content="网格布局" placement="top" align="center">
          <button
            class="p-1.5 rounded-lg transition-colors cursor-pointer"
            :class="layout === 'grid' ? 'bg-gray-500/30 text-foreground' : 'text-gray-400 hover:bg-gray-500/15'"
            @click="layout = 'grid'"
          >
            <LucideLayoutGrid class="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip content="列表布局" placement="top" align="center">
          <button
            class="p-1.5 rounded-lg transition-colors cursor-pointer"
            :class="layout === 'list' ? 'bg-gray-500/30 text-foreground' : 'text-gray-400 hover:bg-gray-500/15'"
            @click="layout = 'list'"
          >
            <LucideList class="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
    <div v-for="year in years" :key="year">
      <div v-if="year" class="font-bold text-4xl pt-4 pb-2 pl-4">
        {{ year }}
      </div>
      <div
        v-if="layout === 'grid'"
        class="grid justify-center"
        :style="{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0px, 1fr))`,
        }"
      >
        <RouterLink
          v-for="album_info in sortedAlbumsList.filter(i => year === 0 || getAlbumYear(i) === year)" :key="album_info.id"
          :to="{ name: 'AlbumInfo', params: { id: album_info.id } }" :title="album_info.name"
        >
          <div class="group p-4 rounded-2xl hover:bg-gray-500/20 transition-colors relative">
            <div class="rounded-2xl overflow-hidden relative">
              <CoverImage :src="getCoverUrl(album_info.platforms, '256px')" />
              <button
                class="absolute bottom-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-all hidden md:flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer shadow-lg rounded-full p-2 bg-black/40 hover:bg-black/60"
                title="播放专辑"
                @click.prevent="playAlbum(album_info.id)"
              >
                <LucidePlay class="size-6 fill-white" />
              </button>
            </div>
            <div class="h-[42px] text-ellipsis text-sm mt-2 line-clamp-2">
              {{ album_info.name }}
            </div>
            <div>
              <span class="text-xs text-gray-500">{{ album_info.publishDate }}</span>
              ·
              <span class="text-xs text-gray-500">{{ album_info.songCount }}</span>
            </div>
          </div>
        </RouterLink>
      </div>
      <div v-else class="flex flex-col">
        <RouterLink
          v-for="album_info in sortedAlbumsList.filter(i => year === 0 || getAlbumYear(i) === year)" :key="album_info.id"
          :to="{ name: 'AlbumInfo', params: { id: album_info.id } }" :title="album_info.name"
        >
          <div class="group flex items-center gap-2 md:gap-3 p-2 md:px-4 rounded-xl hover:bg-gray-500/20 transition-colors">
            <div class="shrink-0 size-14 md:size-20 rounded-lg overflow-hidden">
              <CoverImage :src="getCoverUrl(album_info.platforms, '128px')" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm md:text-base font-medium truncate">
                {{ album_info.name }}
              </div>
              <div class="text-xs text-gray-500 truncate mt-2">
                {{ album_info.publishDate }} · {{ album_info.songCount }}
              </div>
            </div>
            <button
              class="shrink-0 text-gray-400 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all hidden md:block hover:scale-105 active:scale-95 cursor-pointer"
              title="播放专辑"
              @click.prevent="playAlbum(album_info.id)"
            >
              <LucidePlay class="size-6" fill="currentColor" />
            </button>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style>
.square {
    overflow: hidden;
}

.square::after {
    content: '';
    display: block;
    margin-top: 100%;
}
</style>

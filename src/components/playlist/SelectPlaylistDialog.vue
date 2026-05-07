<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { toast } from 'vue-sonner'
import { getMyPlaylistsApi, getPlaylistDetailApi, updatePlaylistSongsApi } from '@/api/music'
import { useMainStore } from '@/store/main'
import { getCoverUrl } from '@/utils'

const props = defineProps<{
  songIds: number[]
  mode?: 'add' | 'overwrite'
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = defineModel<boolean>({ required: true })

const store = useMainStore()
const { albumList } = storeToRefs(store)

const playlists = ref<PlaylistListItem[]>([])
const loading = ref(false)
const submitting = ref(false)

watch(visible, async (v) => {
  if (!v)
    return
  loading.value = true
  try {
    playlists.value = await getMyPlaylistsApi()
  }
  catch (error) {
    toast.error(`获取歌单列表失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    loading.value = false
  }
})

function getCover(playlist: PlaylistListItem) {
  if (!playlist.coverAlbumId)
    return ''
  const album = albumList.value.find(a => a.id === playlist.coverAlbumId)
  return album ? getCoverUrl(album.platforms, '96px') : ''
}

async function select(playlist: PlaylistListItem) {
  submitting.value = true
  try {
    let finalIds: number[]
    if (props.mode === 'overwrite') {
      finalIds = props.songIds
    }
    else {
      const detail = await getPlaylistDetailApi(playlist.id)
      const existing = detail.songs.map(s => s.songId)
      const newIds = props.songIds.filter(id => !existing.includes(id))
      finalIds = [...existing, ...newIds]
    }
    await updatePlaylistSongsApi(playlist.id, finalIds)
    toast.success(props.mode === 'overwrite' ? '歌单已更新' : '已添加至歌单')
    visible.value = false
    emit('success')
  }
  catch (error) {
    toast.error(`操作失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible">
    <template #title>
      {{ mode === 'overwrite' ? '覆盖歌单' : '添加至歌单' }}
    </template>

    <div class="max-h-80 overflow-y-auto">
      <div v-if="loading" class="flex items-center justify-center py-10">
        <LucideLoader2 class="size-6 text-gray-400 animate-spin" />
      </div>
      <div v-else-if="playlists.length === 0" class="py-10 text-center text-sm text-gray-400">
        暂无歌单
      </div>
      <button
        v-for="pl in playlists"
        :key="pl.id"
        class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
        :disabled="submitting"
        @click="select(pl)"
      >
        <div class="size-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          <img v-if="getCover(pl)" :src="getCover(pl)" loading="lazy" class="size-full object-cover">
          <div v-else class="size-full flex items-center justify-center">
            <LucideMusic class="size-5 text-gray-300" />
          </div>
        </div>
        <div class="text-left min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ pl.name }}
          </p>
          <p class="text-xs text-gray-400">
            {{ pl.songCount }} 首歌曲
          </p>
        </div>
        <LucideChevronRight class="size-4 text-gray-300 ml-auto shrink-0" />
      </button>
    </div>

    <template #footer>
      <p class="px-5 py-3 text-xs text-gray-400 text-center">
        {{ mode === 'overwrite' ? '选择后将覆盖歌单中的所有歌曲' : `将添加 ${songIds.length} 首歌曲` }}
      </p>
    </template>
  </AppDialog>
</template>

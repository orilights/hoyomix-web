<script setup lang="ts">
import type { AlbumListItemInfo, PlaylistListItem } from '@/types/core'
import { toast } from 'vue-sonner'
import { createPlaylistApi, updatePlaylistApi, updatePlaylistSongsApi } from '@/api/music'
import { useMainStore } from '@/store/main'
import { getCoverUrl } from '@/utils'

const props = defineProps<{
  initialSongIds?: number[]
  mode?: 'create' | 'edit'
  existingPlaylist?: PlaylistListItem
  initialCoverAlbumId?: number | null
}>()

const emit = defineEmits<{
  success: [id: string]
}>()

const visible = defineModel<boolean>({ required: true })

const store = useMainStore()
const { albumList } = storeToRefs(store)

const loading = ref(false)
const name = ref('')
const description = ref('')
const isPublic = ref(false)
const coverAlbumId = ref<number | null>(null)
const albumSearchText = ref('')

const isEdit = computed(() => props.mode === 'edit')

watch(visible, (v) => {
  if (!v)
    return
  if (isEdit.value && props.existingPlaylist) {
    name.value = props.existingPlaylist.name
    description.value = props.existingPlaylist.description ?? ''
    isPublic.value = props.existingPlaylist.isPublic
    coverAlbumId.value = props.existingPlaylist.coverAlbumId
    albumSearchText.value = albumList.value.find(a => a.id === props.existingPlaylist!.coverAlbumId)?.name ?? ''
  }
  else {
    name.value = ''
    description.value = ''
    isPublic.value = false
    coverAlbumId.value = props.initialCoverAlbumId ?? null
    albumSearchText.value = albumList.value.find(a => a.id === props.initialCoverAlbumId)?.name ?? ''
  }
}, { immediate: false })

const filteredAlbums = computed<AlbumListItemInfo[]>(() => {
  const q = albumSearchText.value.trim().toLowerCase()
  if (!q)
    return albumList.value.slice(0, 20)
  return albumList.value.filter(a => a.name.toLowerCase().includes(q)).slice(0, 20)
})

const showAlbumDropdown = ref(false)

function selectAlbum(album: AlbumListItemInfo) {
  coverAlbumId.value = album.id
  albumSearchText.value = album.name
  showAlbumDropdown.value = false
}

function clearAlbum() {
  coverAlbumId.value = null
  albumSearchText.value = ''
}

function hideAlbumDropdown() {
  window.setTimeout(() => {
    showAlbumDropdown.value = false
  }, 200)
}

function onAlbumInput() {
  showAlbumDropdown.value = true
  const match = albumList.value.find(a => a.name === albumSearchText.value)
  if (!match)
    coverAlbumId.value = null
}

const coverAlbumInfo = computed(() =>
  coverAlbumId.value ? albumList.value.find(a => a.id === coverAlbumId.value) : null,
)

const coverPreviewUrl = computed(() =>
  coverAlbumInfo.value ? getCoverUrl(coverAlbumInfo.value.platforms, '96px') : '',
)

async function submit() {
  if (!name.value.trim()) {
    toast.error('请输入歌单名称')
    return
  }
  loading.value = true
  try {
    let playlistId: string
    if (isEdit.value && props.existingPlaylist) {
      const res = await updatePlaylistApi(props.existingPlaylist.id, {
        name: name.value.trim(),
        description: description.value.trim(),
        coverAlbumId: coverAlbumId.value,
        isPublic: isPublic.value,
      })
      playlistId = res.id
    }
    else {
      const res = await createPlaylistApi({
        name: name.value.trim(),
        description: description.value.trim(),
        coverAlbumId: coverAlbumId.value,
        isPublic: isPublic.value,
      })
      playlistId = res.id
      if (props.initialSongIds?.length) {
        await updatePlaylistSongsApi(playlistId, props.initialSongIds)
      }
    }
    toast.success(isEdit.value ? '歌单已更新' : '歌单已创建')
    visible.value = false
    emit('success', playlistId)
  }
  catch (error) {
    toast.error(isEdit.value ? `更新失败：${error instanceof Error ? error.message : '未知错误'}` : `创建失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" size="md">
    <template #title>
      {{ isEdit ? '编辑歌单' : '新建歌单' }}
    </template>

    <div class="p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">歌单名称 <span class="text-red-500">*</span></label>
        <input
          v-model="name"
          type="text"
          placeholder="输入歌单名称"
          maxlength="30"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
        <textarea
          v-model="description"
          placeholder="输入歌单描述"
          maxlength="500"
          rows="2"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">封面专辑（可选）</label>
        <div class="flex items-center gap-2">
          <div v-if="coverPreviewUrl" class="size-10 rounded-lg overflow-hidden shrink-0">
            <img :src="coverPreviewUrl" class="size-full object-cover" loading="lazy">
          </div>
          <div v-else class="size-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
            <LucideImage class="size-5 text-gray-300" />
          </div>
          <div class="relative flex-1">
            <input
              v-model="albumSearchText"
              type="text"
              placeholder="搜索专辑..."
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              @input="onAlbumInput"
              @focus="showAlbumDropdown = true"
              @blur="hideAlbumDropdown"
            >
            <div
              v-if="showAlbumDropdown && filteredAlbums.length"
              class="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
            >
              <button
                v-for="album in filteredAlbums"
                :key="album.id"
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                @mousedown.prevent="selectAlbum(album)"
              >
                {{ album.name }}
              </button>
            </div>
          </div>
          <button
            v-if="coverAlbumId"
            class="text-gray-400 hover:text-red-500 cursor-pointer"
            @click="clearAlbum"
          >
            <LucideX class="size-4" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700">公开歌单</label>
        <button
          class="relative w-10 h-5.5 rounded-full transition-colors cursor-pointer"
          :class="isPublic ? 'bg-blue-500' : 'bg-gray-200'"
          @click="isPublic = !isPublic"
        >
          <span
            class="absolute top-0.5 left-0.5 size-4.5 bg-white rounded-full shadow transition-transform"
            :class="isPublic ? 'translate-x-4.5' : ''"
          />
        </button>
        <span class="text-xs text-gray-400">{{ isPublic ? '所有人可见' : '仅自己可见' }}</span>
      </div>
    </div>

    <template #footer>
      <div class="px-6 py-4 flex justify-end gap-3">
        <button
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          @click="visible = false"
        >
          取消
        </button>
        <button
          class="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50"
          :disabled="loading || !name.trim()"
          @click="submit"
        >
          {{ loading ? '保存中...' : (isEdit ? '保存更改' : '创建歌单') }}
        </button>
      </div>
    </template>
  </AppDialog>
</template>

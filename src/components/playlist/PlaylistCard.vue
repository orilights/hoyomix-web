<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { getCoverUrl, getPublishDate } from '@/utils'

const props = defineProps<{
  playlist: PlaylistListItem
  showDelete?: boolean
  showOwner?: boolean
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const store = useMainStore()
const auth = useAuthStore()
const { albumList } = storeToRefs(store)
const { user } = storeToRefs(auth)

const coverAlbum = computed(() =>
  props.playlist.coverAlbumId
    ? albumList.value.find(a => a.id === props.playlist.coverAlbumId)
    : null,
)

const coverUrl = computed(() =>
  coverAlbum.value ? getCoverUrl(coverAlbum.value.platforms, '256px') : '',
)
</script>

<template>
  <RouterLink :to="{ name: 'PlaylistDetail', params: { id: playlist.id } }" :title="playlist.name">
    <div class="group p-4 rounded-2xl hover:bg-gray-500/20 transition-colors relative">
      <div class="rounded-2xl overflow-hidden relative">
        <CoverImage v-if="coverUrl" :src="coverUrl" />
        <div v-else class="aspect-square flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <LucideMusic class="size-12 text-blue-400" />
        </div>
        <div class="absolute top-2 left-2 flex gap-2 flex-wrap">
          <div
            v-if="showOwner && playlist.userId === user?.id"
            class=" px-1.5 py-0.5 rounded text-xs bg-black/40 text-white"
          >
            我创建的
          </div>
          <div
            v-if="!playlist.isPublic"
            class=" px-1.5 py-0.5 rounded text-xs bg-black/40 text-white"
          >
            私密
          </div>
          <div
            v-if="showDelete && playlist.reviewStatus === 'pending'"
            class="px-1.5 py-0.5 rounded text-xs bg-yellow-400/80 text-white"
          >
            审核中
          </div>
          <div
            v-else-if="showDelete && playlist.reviewStatus === 'rejected'"
            class="px-1.5 py-0.5 rounded text-xs bg-red-500/80 text-white"
          >
            已驳回
          </div>
        </div>

        <button
          v-if="showDelete"
          class="absolute bottom-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-all hidden md:flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer shadow-lg rounded-full p-2 bg-black/40 hover:bg-red-500"
          title="删除歌单"
          @click.prevent="emit('delete', playlist.id)"
        >
          <LucideTrash2 class="size-4" />
        </button>
      </div>
      <div class="h-[42px] text-ellipsis text-sm mt-2 line-clamp-2">
        {{ playlist.name }}
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        <span>{{ getPublishDate(new Date(playlist.createdAt).getTime()) }}</span>
        ·
        <span>{{ playlist.songCount }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { useMainStore } from '@/store/main'

interface Props {
  isOwner?: boolean
  multiSelectActive?: boolean
  playlistId?: string
  showFavorite?: boolean
  showComments?: boolean
  commentCount: number
}

const props = withDefaults(defineProps<Props>(), {
  isOwner: false,
  multiSelectActive: false,
  showFavorite: true,
  showComments: false,
})

const emit = defineEmits<{
  playAll: []
  addAll: []
  toggleMultiSelect: []
  edit: []
  delete: []
  showComments: []
}>()

const store = useMainStore()

const favoriteTooltip = computed(() =>
  store.favoritePlaylistIds.includes(props.playlistId ?? '') ? '取消收藏歌单' : '收藏歌单',
)
</script>

<template>
  <Tooltip placement="top" theme="light" content="替换当前播放列表并播放">
    <AppButton variant="primary" @click="emit('playAll')">
      <LucidePlay class="size-4" fill="currentColor" />
      播放全部
    </AppButton>
  </Tooltip>

  <Tooltip placement="top" theme="light" content="将专辑内所有歌曲添加至播放列表">
    <AppButton @click="emit('addAll')">
      <LucidePlus class="size-4" />
      加入播放列表
    </AppButton>
  </Tooltip>

  <Tooltip v-if="showFavorite && playlistId" placement="top" theme="light" :content="favoriteTooltip">
    <FavoriteButton
      type="playlist"
      :playlist-id="playlistId"
      variant="action"
    />
  </Tooltip>

  <div v-if="showComments" class="hidden lg:block">
    <AppButton @click="emit('showComments')">
      <LucideMessageCircle class="size-4" />
      评论 {{ commentCount }}
    </AppButton>
  </div>

  <Tooltip placement="top" theme="light" content="切换多选模式">
    <AppButton
      :class="multiSelectActive ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25' : 'bg-gray-500/10 hover:bg-gray-500/20'"
      @click="emit('toggleMultiSelect')"
    >
      <LucideListChecks class="size-4" />
      多选
    </AppButton>
  </Tooltip>

  <template v-if="isOwner">
    <Tooltip placement="top" theme="light" content="编辑歌单信息">
      <AppButton @click="emit('edit')">
        <LucidePencil class="size-4" />
        编辑
      </AppButton>
    </Tooltip>

    <Tooltip placement="top" theme="light" content="删除歌单">
      <AppButton variant="danger" @click="emit('delete')">
        <LucideTrash2 class="size-4" />
        删除
      </AppButton>
    </Tooltip>
  </template>
</template>

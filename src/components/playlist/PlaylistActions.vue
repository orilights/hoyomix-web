<script setup lang="ts">
import { t } from '@/i18n'
import { useMainStore } from '@/store/main'

interface Props {
  isOwner?: boolean
  canSort?: boolean
  sortDisabled?: boolean
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
  sort: []
  edit: []
  delete: []
  showComments: []
}>()

const store = useMainStore()

const favoriteTooltip = computed(() =>
  store.favoritePlaylistIds.includes(props.playlistId ?? '') ? t('PlaylistActions.unsave_playlist') : t('PlaylistActions.save_playlist'),
)
</script>

<template>
  <Tooltip placement="top" theme="light" :content="t('AlbumActions.replace_the_current_queue_and_play')">
    <AppButton variant="primary" @click="emit('playAll')">
      <LucidePlay class="size-4" fill="currentColor" />{{ t('AlbumActions.play_all') }}
    </AppButton>
  </Tooltip>

  <Tooltip placement="top" theme="light" :content="t('PlaylistActions.add_all_songs_in_the_album_to_the_queue')">
    <AppButton @click="emit('addAll')">
      <LucidePlus class="size-4" />{{ t('SongList.add_to_queue') }}
    </AppButton>
  </Tooltip>

  <Tooltip v-if="showFavorite && playlistId" placement="top" theme="light" :content="favoriteTooltip">
    <FavoriteButton
      type="playlist"
      :playlist-id="playlistId"
      variant="action"
    />
  </Tooltip>

  <div v-if="showComments" class="detail-comment-action">
    <AppButton @click="emit('showComments')">
      <LucideMessageCircle class="size-4" />{{ t('AlbumActions.comments', { p0: commentCount }) }}
    </AppButton>
  </div>

  <Tooltip placement="top" theme="light" :content="t('PlaylistActions.toggle_multiple_selection')">
    <AppButton
      :class="multiSelectActive ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25' : 'bg-gray-500/10 hover:bg-gray-500/20'"
      @click="emit('toggleMultiSelect')"
    >
      <LucideListChecks class="size-4" />{{ t('PlaylistActions.select_multiple') }}
    </AppButton>
  </Tooltip>

  <AppButton v-if="canSort" :disabled="sortDisabled" @click="emit('sort')">
    <LucideGripVertical class="size-4" />{{ t('Playlist.reorder') }}
  </AppButton>

  <template v-if="isOwner">
    <Tooltip placement="top" theme="light" :content="t('PlaylistActions.edit_playlist_information')">
      <AppButton @click="emit('edit')">
        <LucidePencil class="size-4" />{{ t('CommentItem.edit') }}
      </AppButton>
    </Tooltip>

    <Tooltip placement="top" theme="light" :content="t('Playlist.delete_playlist')">
      <AppButton variant="danger" @click="emit('delete')">
        <LucideTrash2 class="size-4" />{{ t('SongVideoEditDialog.delete') }}
      </AppButton>
    </Tooltip>
  </template>
</template>

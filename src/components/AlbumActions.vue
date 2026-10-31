<script setup lang="ts">
import { t } from '@/i18n'

interface DropdownOption {
  label: string
  desc?: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  albumId: number
  ncmOptions?: DropdownOption[]
  qqOptions?: DropdownOption[]
  dropdownPosition?: 'down' | 'up' | 'auto'
  commentCount: number
}

withDefaults(defineProps<Props>(), {
  dropdownPosition: 'auto',
})

const emit = defineEmits<{
  playAll: []
  saveAsPlaylist: []
  addToPlaylist: []
  showComments: []
}>()
</script>

<template>
  <Tooltip placement="top" theme="light" :content="t('AlbumActions.replace_the_current_queue_and_play')">
    <AppButton variant="primary" @click="emit('playAll')">
      <LucidePlay class="size-4" fill="currentColor" />{{ t('AlbumActions.play_all') }}
    </AppButton>
  </Tooltip>

  <FavoriteButton type="album" :album-id="albumId" variant="action" />

  <AppButton @click="emit('saveAsPlaylist')">
    <LucideListPlus class="size-4" />{{ t('AlbumActions.save_as_playlist') }}
  </AppButton>

  <AppButton @click="emit('addToPlaylist')">
    <LucideListMusic class="size-4" />{{ t('AlbumActions.add_to_playlist') }}
  </AppButton>

  <div class="detail-comment-action">
    <AppButton @click="emit('showComments')">
      <LucideMessageCircle class="size-4" />{{ t('AlbumActions.comments', { p0: commentCount }) }}
    </AppButton>
  </div>

  <Dropdown v-if="ncmOptions" :position="dropdownPosition" :options="ncmOptions">
    <AppButton icon-only :aria-label="t('AlbumActions.more_netease_cloud_music_actions')">
      <IconNcm class="size-5 text-[#fc3b5b]" />
    </AppButton>
  </Dropdown>

  <Dropdown v-if="qqOptions" :position="dropdownPosition" :options="qqOptions">
    <AppButton icon-only :aria-label="t('AlbumActions.more_qq_music_actions')">
      <IconQQ class="size-5" />
    </AppButton>
  </Dropdown>
</template>

<script setup lang="ts">
import type { SongListItemInfo } from '@/types/core'
import { t } from '@/i18n'
import { goNeteaseClient } from '@/utils'

interface DropdownOption {
  label: string
  desc?: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  musicInfo: SongListItemInfo
  isPlaylistContext?: boolean
  dropdownPosition?: 'down' | 'up' | 'auto'
  prevDisabled?: boolean
  nextDisabled?: boolean
  canEditRegion?: boolean
  hasPendingEditRequest?: boolean
  commentCount: number
}

const props = withDefaults(defineProps<Props>(), {
  isPlaylistContext: false,
  dropdownPosition: 'auto',
  prevDisabled: false,
  nextDisabled: false,
  canEditRegion: false,
  hasPendingEditRequest: false,
})

const emit = defineEmits<{
  play: []
  prev: []
  next: []
  addToPlaylist: []
  editInfo: []
  editCredits: []
  editSongTags: []
  editRegion: []
  editVideo: []
  myRequests: []
  showComments: []
}>()

const ncmOptions = computed<DropdownOption[]>(() => {
  const ncm = props.musicInfo.platforms.ncm
  if (!ncm)
    return []
  return [
    {
      label: t('MusicActions.view_details'),
      onClick: () => {
        window.open(`https://music.163.com/#/song?id=${ncm.id}`)
      },
    },
    {
      label: t('MusicActions.play_in_app'),
      onClick: () => {
        goNeteaseClient({
          type: 'song',
          id: ncm.id,
          cmd: 'play',
        })
      },
    },
  ]
})

const qqOptions = computed<DropdownOption[]>(() => {
  const qq = props.musicInfo.platforms.qq
  if (!qq)
    return []
  return [
    {
      label: t('MusicActions.view_details'),
      onClick: () => {
        window.open(`https://y.qq.com/n/ryqq_v2/songDetail/${qq.id}`)
      },
    },
  ]
})

const prevTooltip = computed(() => props.isPlaylistContext ? t('MusicActions.previous_song_in_playlist') : t('MusicActions.previous_song_in_album'))
const nextTooltip = computed(() => props.isPlaylistContext ? t('MusicActions.next_song_in_playlist') : t('MusicActions.next_song_in_album'))

const infoEditOptions = computed<DropdownOption[]>(() => {
  const options: DropdownOption[] = []
  options.push({ label: t('MusicActions.my_requests'), onClick: () => emit('myRequests') })
  options.push({ label: t('MusicActions.song_information'), onClick: () => emit('editInfo') })
  options.push({ label: t('MusicActions.credits'), onClick: () => emit('editCredits') })
  options.push({ label: t('MusicActions.song_tags'), onClick: () => emit('editSongTags') })
  if (props.canEditRegion) {
    options.push({ label: t('MusicActions.linked_regions'), onClick: () => emit('editRegion') })
  }
  // options.push({ label: '视频关联', onClick: () => emit('editVideo') })
  return options
})
</script>

<template>
  <Tooltip placement="top" theme="light" :content="t('MusicActions.play_next')">
    <AppButton variant="primary" @click="emit('play')">
      <LucidePlay class="size-4" fill="currentColor" />{{ t('MusicActions.play') }}
    </AppButton>
  </Tooltip>

  <FavoriteButton type="song" :song-id="musicInfo.id" variant="action" />

  <AppButton @click="emit('addToPlaylist')">
    <LucideListMusic class="size-4" />{{ t('AlbumActions.add_to_playlist') }}
  </AppButton>

  <div class="detail-comment-action">
    <AppButton @click="emit('showComments')">
      <LucideMessageCircle class="size-4" />{{ t('AlbumActions.comments', { p0: commentCount }) }}
    </AppButton>
  </div>

  <Dropdown :position="dropdownPosition" :options="infoEditOptions">
    <AppButton>
      <LucidePencil class="size-4" />{{ t('MusicActions.edit_information') }}<span v-if="hasPendingEditRequest" class="text-xs rounded px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">{{ t('MusicActions.pending_review') }}</span>
    </AppButton>
  </Dropdown>

  <Dropdown v-if="ncmOptions.length" :position="dropdownPosition" :options="ncmOptions">
    <AppButton icon-only :aria-label="t('AlbumActions.more_netease_cloud_music_actions')">
      <IconNcm class="size-5 text-[#fc3b5b]" />
    </AppButton>
  </Dropdown>

  <Dropdown v-if="qqOptions.length" :position="dropdownPosition" :options="qqOptions">
    <AppButton icon-only :aria-label="t('AlbumActions.more_qq_music_actions')">
      <IconQQ class="size-5" />
    </AppButton>
  </Dropdown>

  <Tooltip placement="top" theme="light" :content="prevTooltip">
    <AppButton
      icon-only
      :aria-label="t('MusicActions.previous_song')"
      :class="{ 'opacity-50 cursor-not-allowed hover:bg-gray-500/10': prevDisabled }"
      :disabled="prevDisabled"
      @click="emit('prev')"
    >
      <LucideChevronLeft class="size-5" />
    </AppButton>
  </Tooltip>

  <Tooltip placement="top" theme="light" :content="nextTooltip">
    <AppButton
      icon-only
      :aria-label="t('MusicActions.next_song')"
      :class="{ 'opacity-50 cursor-not-allowed hover:bg-gray-500/10': nextDisabled }"
      :disabled="nextDisabled"
      @click="emit('next')"
    >
      <LucideChevronRight class="size-5" />
    </AppButton>
  </Tooltip>
</template>

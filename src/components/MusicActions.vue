<script setup lang="ts">
import type { SongListItemInfo } from '@/types/core'
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
  commentCount: number
}

const props = withDefaults(defineProps<Props>(), {
  isPlaylistContext: false,
  dropdownPosition: 'auto',
  prevDisabled: false,
  nextDisabled: false,
  canEditRegion: false,
})

const emit = defineEmits<{
  play: []
  prev: []
  next: []
  addToPlaylist: []
  editInfo: []
  editRegion: []
  editVideo: []
  showComments: []
}>()

const ncmOptions = computed<DropdownOption[]>(() => {
  const ncm = props.musicInfo.platforms.ncm
  if (!ncm)
    return []
  return [
    {
      label: '跳转至详情页',
      onClick: () => {
        window.open(`https://music.163.com/#/song?id=${ncm.id}`)
      },
    },
    {
      label: '在 APP 中播放',
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
      label: '跳转至详情页',
      onClick: () => {
        window.open(`https://y.qq.com/n/ryqq_v2/songDetail/${qq.id}`)
      },
    },
  ]
})

const prevTooltip = computed(() => props.isPlaylistContext ? '前往歌单上一首歌曲' : '前往专辑上一首歌曲')
const nextTooltip = computed(() => props.isPlaylistContext ? '前往歌单下一首歌曲' : '前往专辑下一首歌曲')

const infoEditOptions = computed<DropdownOption[]>(() => {
  const options: DropdownOption[] = []
  options.push({ label: '歌曲信息', onClick: () => emit('editInfo') })
  if (props.canEditRegion) {
    options.push({ label: '地区关联', onClick: () => emit('editRegion') })
  }
  // options.push({ label: '视频关联', onClick: () => emit('editVideo') })
  return options
})
</script>

<template>
  <Tooltip placement="top" theme="light" content="插入到下一首并播放">
    <AppButton variant="primary" @click="emit('play')">
      <LucidePlay class="size-4" fill="currentColor" />
      播放
    </AppButton>
  </Tooltip>

  <FavoriteButton type="song" :song-id="musicInfo.id" variant="action" />

  <AppButton @click="emit('addToPlaylist')">
    <LucideListMusic class="size-4" />
    添加至歌单
  </AppButton>

  <div class="hidden lg:block">
    <AppButton @click="emit('showComments')">
      <LucideMessageCircle class="size-4" />
      评论 {{ commentCount }}
    </AppButton>
  </div>

  <Dropdown :position="dropdownPosition" :options="infoEditOptions">
    <AppButton>
      <LucidePencil class="size-4" />
      信息修改
    </AppButton>
  </Dropdown>

  <Dropdown v-if="ncmOptions.length" :position="dropdownPosition" :options="ncmOptions">
    <AppButton icon-only aria-label="网易云音乐更多操作">
      <IconNcm class="size-5 text-[#fc3b5b]" />
    </AppButton>
  </Dropdown>

  <Dropdown v-if="qqOptions.length" :position="dropdownPosition" :options="qqOptions">
    <AppButton icon-only aria-label="QQ音乐更多操作">
      <IconQQ class="size-5" />
    </AppButton>
  </Dropdown>

  <Tooltip placement="top" theme="light" :content="prevTooltip">
    <AppButton
      icon-only
      aria-label="上一首"
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
      aria-label="下一首"
      :class="{ 'opacity-50 cursor-not-allowed hover:bg-gray-500/10': nextDisabled }"
      :disabled="nextDisabled"
      @click="emit('next')"
    >
      <LucideChevronRight class="size-5" />
    </AppButton>
  </Tooltip>
</template>

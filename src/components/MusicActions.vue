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
  <Tooltip placement="top" theme="light" content="添加至播放列表并播放">
    <button
      class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
      @click="emit('play')"
    >
      <LucidePlay class="size-4" fill="currentColor" />
      播放
    </button>
  </Tooltip>

  <SongFavoriteButton :song-id="musicInfo.id" variant="action" />

  <button
    class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
    @click="emit('addToPlaylist')"
  >
    <LucideListMusic class="size-4" />
    添加至歌单
  </button>

  <Dropdown :position="dropdownPosition" :options="infoEditOptions">
    <button
      class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
    >
      <LucidePencil class="size-4" />
      信息修改
    </button>
  </Dropdown>

  <Dropdown v-if="ncmOptions.length" :position="dropdownPosition" :options="ncmOptions">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
    >
      <IconNcm class="size-5 text-[#fc3b5b]" />
    </button>
  </Dropdown>

  <Dropdown v-if="qqOptions.length" :position="dropdownPosition" :options="qqOptions">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
    >
      <IconQQ class="size-5" />
    </button>
  </Dropdown>

  <Tooltip placement="top" theme="light" :content="prevTooltip">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
      :class="{ 'opacity-50 cursor-not-allowed hover:bg-gray-500/10': prevDisabled }"
      :disabled="prevDisabled"
      @click="emit('prev')"
    >
      <LucideChevronLeft class="size-5" />
    </button>
  </Tooltip>

  <Tooltip placement="top" theme="light" :content="nextTooltip">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
      :class="{ 'opacity-50 cursor-not-allowed hover:bg-gray-500/10': nextDisabled }"
      :disabled="nextDisabled"
      @click="emit('next')"
    >
      <LucideChevronRight class="size-5" />
    </button>
  </Tooltip>
</template>

<script setup lang="ts">
interface DropdownOption {
  label: string
  desc?: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  ncmOptions?: DropdownOption[]
  qqOptions?: DropdownOption[]
  dropdownPosition?: 'down' | 'up' | 'auto'
  prevTooltip?: string
  nextTooltip?: string
  prevDisabled?: boolean
  nextDisabled?: boolean
}

withDefaults(defineProps<Props>(), {
  dropdownPosition: 'auto',
  prevTooltip: '前往专辑上一首歌曲',
  nextTooltip: '前往专辑下一首歌曲',
  prevDisabled: false,
  nextDisabled: false,
})

const emit = defineEmits<{
  play: []
  prev: []
  next: []
  addToPlaylist: []
}>()
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

  <Tooltip placement="top" theme="light" :content="prevTooltip">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
      :class="{ 'opacity-50 cursor-not-allowed hover:bg-gray-500/10': prevDisabled }"
      :disabled="prevDisabled"
      @click="emit('prev')"
    >
      前一首
    </button>
  </Tooltip>

  <Tooltip placement="top" theme="light" :content="nextTooltip">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
      :class="{ 'opacity-50 cursor-not-allowed hover:bg-gray-500/10': nextDisabled }"
      :disabled="nextDisabled"
      @click="emit('next')"
    >
      后一首
    </button>
  </Tooltip>

  <Dropdown v-if="ncmOptions" :position="dropdownPosition" :options="ncmOptions">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
    >
      <IconNcm class="size-5 text-[#fc3b5b]" />
    </button>
  </Dropdown>

  <Dropdown v-if="qqOptions" :position="dropdownPosition" :options="qqOptions">
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
    >
      <IconQQ class="size-5" />
    </button>
  </Dropdown>

  <Tooltip placement="top" theme="light" content="将歌曲添加至歌单">
    <button
      class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
      @click="emit('addToPlaylist')"
    >
      <LucideListMusic class="size-4" />
      添加至歌单
    </button>
  </Tooltip>
</template>

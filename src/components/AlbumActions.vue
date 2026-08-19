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
}

withDefaults(defineProps<Props>(), {
  dropdownPosition: 'auto',
})

const emit = defineEmits<{
  playAll: []
  saveAsPlaylist: []
  addToPlaylist: []
}>()
</script>

<template>
  <Tooltip placement="top" theme="light" content="替换当前播放列表并播放">
    <button
      class="text-sm bg-blue-500/90 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
      @click="emit('playAll')"
    >
      <LucidePlay class="size-4" fill="currentColor" />
      播放全部
    </button>
  </Tooltip>

  <button
    class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
    @click="emit('saveAsPlaylist')"
  >
    <LucideListPlus class="size-4" />
    保存为歌单
  </button>

  <button
    class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
    @click="emit('addToPlaylist')"
  >
    <LucideListMusic class="size-4" />
    添加至歌单
  </button>

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
</template>

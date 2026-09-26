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
  <Tooltip placement="top" theme="light" content="替换当前播放列表并播放">
    <AppButton variant="primary" @click="emit('playAll')">
      <LucidePlay class="size-4" fill="currentColor" />
      播放全部
    </AppButton>
  </Tooltip>

  <AppButton @click="emit('saveAsPlaylist')">
    <LucideListPlus class="size-4" />
    保存为歌单
  </AppButton>

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

  <Dropdown v-if="ncmOptions" :position="dropdownPosition" :options="ncmOptions">
    <AppButton icon-only aria-label="网易云音乐更多操作">
      <IconNcm class="size-5 text-[#fc3b5b]" />
    </AppButton>
  </Dropdown>

  <Dropdown v-if="qqOptions" :position="dropdownPosition" :options="qqOptions">
    <AppButton icon-only aria-label="QQ音乐更多操作">
      <IconQQ class="size-5" />
    </AppButton>
  </Dropdown>
</template>

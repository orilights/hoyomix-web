<script setup lang="ts">
interface Props {
  isOwner?: boolean
  multiSelectActive?: boolean
}

withDefaults(defineProps<Props>(), {
  isOwner: false,
  multiSelectActive: false,
})

const emit = defineEmits<{
  playAll: []
  addAll: []
  toggleMultiSelect: []
  edit: []
  delete: []
}>()
</script>

<template>
  <Tooltip placement="top" theme="light" content="替换当前播放列表并播放">
    <button
      class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
      @click="emit('playAll')"
    >
      <LucidePlay class="size-4" fill="currentColor" />
      播放全部
    </button>
  </Tooltip>

  <Tooltip placement="top" theme="light" content="将专辑内所有歌曲添加至播放列表">
    <button
      class="text-sm bg-gray-500/10 px-4 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
      @click="emit('addAll')"
    >
      <LucidePlus class="size-4" />
      加入播放列表
    </button>
  </Tooltip>

  <Tooltip placement="top" theme="light" content="切换多选模式">
    <button
      class="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
      :class="multiSelectActive ? 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25' : 'bg-gray-500/10 hover:bg-gray-500/20'"
      @click="emit('toggleMultiSelect')"
    >
      <LucideListChecks class="size-4" />
      多选
    </button>
  </Tooltip>

  <template v-if="isOwner">
    <Tooltip placement="top" theme="light" content="编辑歌单信息">
      <button
        class="text-sm bg-gray-500/10 px-4 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1"
        @click="emit('edit')"
      >
        <LucidePencil class="size-4" />
        编辑
      </button>
    </Tooltip>

    <Tooltip placement="top" theme="light" content="删除歌单">
      <button
        class="text-sm bg-red-50 text-red-500 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1"
        @click="emit('delete')"
      >
        <LucideTrash2 class="size-4" />
        删除
      </button>
    </Tooltip>
  </template>
</template>

<script setup lang="ts">
import { useMainStore } from '@/store/main'

const props = defineProps<{
  selectedIds: number[]
  title?: string
}>()

const emit = defineEmits<{
  'update:selectedIds': [ids: number[]]
}>()

const visible = defineModel<boolean>({ required: true })

const store = useMainStore()
const { albumList } = storeToRefs(store)

const searchQuery = ref('')
const localSelected = ref<number[]>([])

watch(visible, (v) => {
  if (v) {
    localSelected.value = [...props.selectedIds]
    searchQuery.value = ''
  }
})

const filteredAlbums = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return albumList.value
  return albumList.value.filter(a => a.name.toLowerCase().includes(q) || a.publishDate.includes(q))
})

function toggle(id: number) {
  const idx = localSelected.value.indexOf(id)
  if (idx === -1)
    localSelected.value.push(id)
  else
    localSelected.value.splice(idx, 1)
}

function confirm() {
  emit('update:selectedIds', [...localSelected.value])
  visible.value = false
}
</script>

<template>
  <AppDialog v-model="visible" :title="title ?? '选择专辑'" size="md">
    <div class="px-6 pt-3 pb-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索专辑名称或日期..."
        class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
    </div>
    <div class="px-6 pb-2 flex items-center justify-between text-sm">
      <span class="text-gray-500">已选 {{ localSelected.length }} 张</span>
      <button
        class="text-blue-500 hover:text-blue-600 cursor-pointer"
        @click="localSelected = []"
      >
        清空
      </button>
    </div>
    <div class="h-72 overflow-y-auto px-3 pb-2">
      <button
        v-for="album in filteredAlbums"
        :key="album.id"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-left"
        @click="toggle(album.id)"
      >
        <div
          class="size-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors"
          :class="localSelected.includes(album.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"
        >
          <LucideCheck v-if="localSelected.includes(album.id)" class="size-3 text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">
            {{ album.name }}
          </div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ album.publishDate }}
          </div>
        </div>
      </button>
      <div v-if="!filteredAlbums.length" class="py-8 text-center text-sm text-gray-400">
        无匹配专辑
      </div>
    </div>
    <template #footer>
      <div class="px-6 py-3 flex justify-end gap-2">
        <AppButton
          variant="outline"
          @click="visible = false"
        >
          取消
        </AppButton>
        <AppButton
          variant="primary"
          @click="confirm"
        >
          确定
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

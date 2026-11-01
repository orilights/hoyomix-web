<script setup lang="ts">
import { t } from '@/i18n'
import { useMainStore } from '@/store/main'
import { getPublishDate } from '@/utils/time'

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
  <AppDialog v-model="visible" :close-on-click-overlay="false" :title="title ?? t('AlbumPickerDialog.select_albums')" size="md">
    <div class="px-6 pt-3 pb-2">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('AlbumPickerDialog.search_album_names_or_dates')"
        class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
    </div>
    <div class="px-6 pb-2 flex items-center justify-between text-sm">
      <span class="text-gray-500 dark:text-gray-400">{{ t('AlbumPickerDialog.album_selected', { p0: localSelected.length }, Number(localSelected.length)) }}</span>
      <AppButton
        variant="ghost"
        size="sm"
        @click="localSelected = []"
      >
        {{ t('AlbumPickerDialog.clear') }}
      </AppButton>
    </div>
    <div class="h-72 overflow-y-auto px-3 pb-2">
      <button
        v-for="album in filteredAlbums"
        :key="album.id"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 hover:dark:bg-gray-800 cursor-pointer text-left"
        @click="toggle(album.id)"
      >
        <div
          class="size-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors"
          :class="localSelected.includes(album.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-700'"
        >
          <LucideCheck v-if="localSelected.includes(album.id)" class="size-3 text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">
            {{ album.name }}
          </div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ getPublishDate(album.publishDate) }}
          </div>
        </div>
      </button>
      <div v-if="!filteredAlbums.length" class="py-8 text-center text-sm text-gray-400">
        {{ t('AlbumPickerDialog.no_matching_albums') }}
      </div>
    </div>
    <template #footer>
      <div class="px-6 py-3 flex justify-end gap-2">
        <AppButton
          variant="outline"
          @click="visible = false"
        >
          {{ t('AlbumPickerDialog.cancel') }}
        </AppButton>
        <AppButton
          variant="primary"
          @click="confirm"
        >
          {{ t('AlbumPickerDialog.confirm') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

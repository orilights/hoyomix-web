<script setup lang="ts">
import type { MapTreeNode, SongMapInfo, SongMapsChange } from '@/types/core'
import { toast } from 'vue-sonner'
import { submitSongRegionEditApi } from '@/api/music'
import { useMapTreeQuery } from '@/composables/queries'

const props = defineProps<{
  songId: number
  game: string
  maps: SongMapInfo[]
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = defineModel<boolean>({ required: true })

// ── 地图树数据 ──────────────────────────────
const { data: mapTree, isPending: loading, isError: loadError } = useMapTreeQuery(
  computed(() => props.game),
  visible,
)
const tree = computed(() => mapTree.value ?? [])
const expandedIds = ref<Set<number>>(new Set())
const searchText = ref('')
const pathById = ref<Map<number, string[]>>(new Map())

// ── 变更状态 ──────────────────────────────
interface AddItem { mapId: number, path: string[], note: string }
const removeIds = ref<number[]>([])
const addItems = ref<AddItem[]>([])
const submitting = ref(false)
const noteDrafts = ref<Record<number, string>>({})
const originalNotes = ref<Record<number, string>>({})

function normalizeNote(note: string | undefined) {
  return note?.trim() || null
}

const noteUpdates = computed(() => props.maps
  .filter(m => !removeIds.value.includes(m.id)
    && normalizeNote(noteDrafts.value[m.id]) !== normalizeNote(originalNotes.value[m.id]))
  .map(m => ({ mapId: m.id, note: normalizeNote(noteDrafts.value[m.id]) })))

function buildPathIndex(nodes: MapTreeNode[], parent: string[] = []) {
  for (const n of nodes) {
    const path = [...parent, n.name]
    pathById.value.set(n.id, path)
    buildPathIndex(n.children, path)
  }
}

watch(visible, (v) => {
  if (!v)
    return
  removeIds.value = []
  addItems.value = []
  noteDrafts.value = Object.fromEntries(props.maps.map(m => [m.id, m.note ?? '']))
  originalNotes.value = { ...noteDrafts.value }
  searchText.value = ''
  expandedIds.value = new Set()
}, { immediate: true })

watch(tree, (nodes) => {
  pathById.value = new Map()
  buildPathIndex(nodes)
}, { immediate: true })

// 过滤树：保留匹配节点及其祖先
function filterTree(nodes: MapTreeNode[], kw: string): MapTreeNode[] {
  const result: MapTreeNode[] = []
  for (const n of nodes) {
    const children = filterTree(n.children, kw)
    if (n.name.toLowerCase().includes(kw) || children.length)
      result.push({ ...n, children })
  }
  return result
}

const isSearching = computed(() => !!searchText.value.trim())

const filteredTree = computed(() => {
  const kw = searchText.value.trim().toLowerCase()
  if (!kw)
    return tree.value
  return filterTree(tree.value, kw)
})

// 展平可见节点（搜索时全部展开）
interface VisibleNode { node: MapTreeNode, depth: number }
const visibleNodes = computed<VisibleNode[]>(() => {
  const out: VisibleNode[] = []
  const walk = (nodes: MapTreeNode[], depth: number) => {
    for (const n of nodes) {
      out.push({ node: n, depth })
      if ((isSearching.value || expandedIds.value.has(n.id)) && n.children.length)
        walk(n.children, depth + 1)
    }
  }
  walk(filteredTree.value, 0)
  return out
})

function toggleExpand(id: number) {
  const next = new Set(expandedIds.value)
  if (next.has(id))
    next.delete(id)
  else
    next.add(id)
  expandedIds.value = next
}

// 勾选集合：当前地区（未移除）+ 待添加
const selectedIds = computed(() => {
  const ids = new Set<number>()
  for (const m of props.maps) {
    if (!removeIds.value.includes(m.id))
      ids.add(m.id)
  }
  for (const a of addItems.value)
    ids.add(a.mapId)
  return [...ids]
})

function toggleNode(id: number) {
  const isCurrent = props.maps.some(m => m.id === id)
  if (isCurrent) {
    if (removeIds.value.includes(id))
      removeIds.value = removeIds.value.filter(x => x !== id)
    else
      removeIds.value = [...removeIds.value, id]
  }
  else {
    const idx = addItems.value.findIndex(a => a.mapId === id)
    if (idx >= 0)
      addItems.value.splice(idx, 1)
    else
      addItems.value = [...addItems.value, { mapId: id, path: pathById.value.get(id) ?? [String(id)], note: '' }]
  }
}

function removeAddItem(mapId: number) {
  addItems.value = addItems.value.filter(a => a.mapId !== mapId)
}

function pathText(path: string[]) {
  return path.join(' > ')
}

function isRemoved(id: number) {
  return removeIds.value.includes(id)
}

const canSubmit = computed(() => removeIds.value.length > 0 || addItems.value.length > 0 || noteUpdates.value.length > 0)

function close() {
  visible.value = false
}

async function submit() {
  if (!canSubmit.value || submitting.value)
    return
  submitting.value = true
  try {
    const maps: SongMapsChange = {}
    if (addItems.value.length) {
      maps.add = addItems.value.map(a => ({
        mapId: a.mapId,
        note: a.note.trim() ? a.note.trim() : null,
      }))
    }
    if (removeIds.value.length)
      maps.remove = removeIds.value.map(id => ({ mapId: id }))

    if (noteUpdates.value.length)
      maps.update = noteUpdates.value

    const res = await submitSongRegionEditApi(props.songId, maps)
    if (res.directApproved)
      toast.success('地区变更已生效')
    else
      toast.success('申请已提交，等待审核')
    close()
    emit('success')
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '提交失败')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" size="md">
    <template #title>
      修改地区关联
    </template>

    <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <div class="px-3 py-2 rounded-lg bg-orange-100 text-orange-600 text-xs leading-relaxed">
        信息修改需审核后生效，对一首歌曲每类修改最多同时提交一次申请
      </div>

      <div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          当前地区
        </p>
        <div v-if="!maps.length" class="text-xs text-gray-400">
          暂无地区标签
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="map in maps"
            :key="map.id"
            class="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
            :class="{ 'opacity-50': isRemoved(map.id) }"
          >
            <div class="flex items-center gap-2" :class="{ 'line-through': isRemoved(map.id) }">
              <span class="flex-1 truncate">{{ pathText(map.path) }}</span>
              <button
                type="button"
                class="text-xs px-2 py-0.5 rounded shrink-0 cursor-pointer transition-colors"
                :class="isRemoved(map.id) ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'"
                @click="toggleNode(map.id)"
              >
                {{ isRemoved(map.id) ? '恢复' : '移除' }}
              </button>
            </div>
            <input
              v-model="noteDrafts[map.id]"
              type="text"
              :disabled="isRemoved(map.id)"
              :aria-label="`${pathText(map.path)}备注`"
              placeholder="备注（可选，最多 500 字）"
              maxlength="500"
              class="mt-1 w-full px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed"
            >
          </div>
        </div>
      </div>

      <div v-if="addItems.length">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          待添加地区
        </p>
        <div class="space-y-2">
          <div
            v-for="item in addItems"
            :key="item.mapId"
            class="px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-sm"
          >
            <div class="flex items-center gap-2">
              <span class="flex-1 truncate">{{ pathText(item.path) }}</span>
              <button
                type="button"
                class="text-xs text-red-500 hover:text-red-600 hover:dark:text-red-400 cursor-pointer shrink-0"
                @click="removeAddItem(item.mapId)"
              >
                移除
              </button>
            </div>
            <input
              v-model="item.note"
              type="text"
              placeholder="备注（可选，最多 500 字）"
              maxlength="500"
              class="mt-1 w-full px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
          </div>
        </div>
      </div>

      <div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          选择地区
        </p>
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索地区"
          class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
        <div class="mt-2">
          <div v-if="loading && game" class="flex items-center justify-center py-8 text-gray-400">
            <LucideLoader2 class="size-5 animate-spin mr-2" />
            加载中...
          </div>
          <div v-else-if="loadError || !game" class="flex items-center justify-center py-8 text-gray-400 text-sm">
            地图数据加载失败
          </div>
          <div v-else-if="!tree.length" class="flex items-center justify-center py-8 text-gray-400 text-sm">
            该作品暂不支持地区标签
          </div>
          <div v-else class="border border-gray-100 dark:border-gray-700 rounded-lg max-h-56 overflow-y-auto py-1">
            <div
              v-for="vn in visibleNodes"
              :key="vn.node.id"
              class="flex items-center gap-1 px-2 py-1 hover:bg-gray-50 hover:dark:bg-gray-800 cursor-pointer"
              :style="{ paddingLeft: `${8 + vn.depth * 16}px` }"
            >
              <button
                v-if="vn.node.children.length"
                type="button"
                class="size-4 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:dark:text-gray-400 shrink-0 cursor-pointer"
                @click.stop="toggleExpand(vn.node.id)"
              >
                <LucideChevronRight
                  class="size-3.5 transition-transform"
                  :class="{ 'rotate-90': expandedIds.has(vn.node.id) }"
                />
              </button>
              <span v-else class="size-4 shrink-0" />

              <button
                type="button"
                class="flex-1 flex items-center gap-2 text-left text-sm cursor-pointer"
                @click="toggleNode(vn.node.id)"
              >
                <span
                  class="size-4 rounded border flex items-center justify-center shrink-0"
                  :class="selectedIds.includes(vn.node.id) ? 'bg-blue-500 border-blue-500' : 'bg-white dark:bg-[var(--theme-surface)] border-gray-300 dark:border-gray-700'"
                >
                  <LucideCheck v-if="selectedIds.includes(vn.node.id)" class="size-3 text-white" />
                </span>
                <span class="truncate" :class="selectedIds.includes(vn.node.id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'">
                  {{ vn.node.name }}
                </span>
              </button>
            </div>
            <div v-if="!visibleNodes.length" class="px-3 py-6 text-center text-xs text-gray-400">
              未找到匹配地区
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="px-6 py-4 flex items-center justify-end gap-2">
        <AppButton
          type="button"
          @click="close"
        >
          取消
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          <LucideLoader2 v-if="submitting" class="size-4 animate-spin" />
          {{ submitting ? '提交中...' : '提交申请' }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
</style>

<script setup lang="ts">
import type { MapTreeNode } from '@/types/core'
import { buildRegionIndex, filterPopulatedRegions } from '@/utils/regions'

const props = defineProps<{
  tree: MapTreeNode[]
  selectedId: number | null
}>()
const emit = defineEmits<{ select: [id: number] }>()
const keyword = defineModel<string>('keyword', { required: true })
const expanded = defineModel<Set<number>>('expanded', { required: true })
const populatedTree = computed(() => filterPopulatedRegions(props.tree))
const index = computed(() => buildRegionIndex(populatedTree.value))
const query = computed(() => keyword.value.trim().toLocaleLowerCase())
const treeRoot = useTemplateRef('treeRoot')

function revealSelection() {
  const next = new Set(expanded.value)
  for (const ancestor of index.value.get(props.selectedId ?? -1)?.path ?? [])
    next.add(ancestor.id)
  expanded.value = next
}
watch([() => props.selectedId, index], async () => {
  revealSelection()
  await nextTick()
  treeRoot.value?.querySelector(`[data-region-id="${props.selectedId}"]`)?.scrollIntoView({ block: 'nearest' })
}, { immediate: true })
watch(query, (value, old) => {
  if (!value && old)
    revealSelection()
})

const visibleNodes = computed(() => {
  const keep = new Set<number>()
  if (query.value) {
    for (const item of index.value.values()) {
      if (item.path.some(part => part.name.toLocaleLowerCase().includes(query.value))) {
        for (const part of item.path)
          keep.add(part.id)
      }
    }
  }
  const rows: { node: MapTreeNode, depth: number, path: string }[] = []
  function visit(nodes: MapTreeNode[], depth: number) {
    for (const node of nodes) {
      if (query.value && !keep.has(node.id))
        continue
      rows.push({ node, depth, path: index.value.get(node.id)!.path.map(part => part.name).join(' / ') })
      if (query.value || expanded.value.has(node.id))
        visit(node.children, depth + 1)
    }
  }
  visit(populatedTree.value, 0)
  return rows
})

function selectNode(id: number) {
  expanded.value = new Set([...expanded.value, id])
  emit('select', id)
}

function toggle(id: number) {
  const next = new Set(expanded.value)
  if (next.has(id))
    next.delete(id)
  else
    next.add(id)
  expanded.value = next
}

function enterRow(element: Element) {
  const row = element as HTMLElement
  // 高度为零时 flex 居中的子元素会向上溢出，scrollHeight 可能只有自然高度的一半。
  const height = Math.max(row.scrollHeight, ...Array.from(row.children, child => child.getBoundingClientRect().height))
  row.style.setProperty('--region-row-height', `${height}px`)
}

function leaveRow(element: Element) {
  const row = element as HTMLElement
  row.style.setProperty('--region-row-height', `${row.getBoundingClientRect().height}px`)
}
</script>

<template>
  <div ref="treeRoot">
    <div class="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg px-3 mb-3 focus-within:ring-2 focus-within:ring-blue-400/60">
      <LucideSearch class="size-4 shrink-0 text-gray-400" />
      <input v-model="keyword" aria-label="搜索地区" placeholder="搜索地区名称" class="min-w-0 w-full h-9 bg-transparent text-base md:text-sm outline-none">
      <AppButton v-if="keyword" icon-only size="sm" variant="ghost" aria-label="清空地区搜索" @click="keyword = ''">
        <LucideX class="size-4" />
      </AppButton>
    </div>
    <nav aria-label="地区地图树">
      <TransitionGroup tag="ul" name="region-row" @enter="enterRow" @before-leave="leaveRow">
        <li
          v-for="row in visibleNodes" :key="row.node.id"
          :data-region-id="row.node.id"
          class="region-row flex items-center min-w-0 rounded-lg transition-colors"
          :class="selectedId === row.node.id ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-black/5 hover:dark:bg-white/5'"
          :style="{ paddingLeft: `${row.depth * 16}px` }"
        >
          <AppButton
            v-if="row.node.children.length" icon-only variant="ghost" class="shrink-0"
            :disabled="!!query" :aria-expanded="!!query || expanded.has(row.node.id)"
            :aria-label="`${query || expanded.has(row.node.id) ? '折叠' : '展开'}${row.node.name}`"
            @click="toggle(row.node.id)"
          >
            <LucideChevronRight class="region-chevron size-4" :class="{ 'rotate-90': query || expanded.has(row.node.id) }" />
          </AppButton>
          <span v-else class="w-9 shrink-0" />
          <button
            type="button" class="min-w-0 flex-1 flex items-center gap-2 text-left text-sm py-2 pr-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
            :aria-current="selectedId === row.node.id ? 'location' : undefined" :title="row.path"
            @click="selectNode(row.node.id)"
          >
            <span class="truncate">{{ row.node.name }}</span>
            <span class="ml-auto shrink-0 text-xs tabular-nums" :class="selectedId === row.node.id ? 'text-blue-500/80' : 'text-gray-500 dark:text-gray-400'" :aria-label="`${row.node.songCount} 首歌曲，包含子地区`">{{ row.node.songCount }}</span>
          </button>
        </li>
      </TransitionGroup>
      <p v-if="!visibleNodes.length" class="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
        {{ query ? '未找到相关地区' : '暂无地区' }}
      </p>
    </nav>
  </div>
</template>

<style scoped>
.region-row {
  margin-bottom: 2px;
}

.region-row-enter-active,
.region-row-leave-active {
  overflow: hidden;
  transition: height 0.18s ease, opacity 0.18s ease, margin-bottom 0.18s ease;
}

.region-row-enter-from,
.region-row-leave-to {
  height: 0;
  margin-bottom: 0;
  opacity: 0;
}

.region-row-enter-to,
.region-row-leave-from {
  height: var(--region-row-height);
}

.region-row-leave-active {
  pointer-events: none;
}

.region-chevron {
  transition: transform 0.18s ease;
}

@media (prefers-reduced-motion: reduce) {
  .region-row-enter-active,
  .region-row-leave-active,
  .region-chevron {
    transition: none;
  }
}
</style>

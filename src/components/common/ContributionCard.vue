<script setup lang="ts">
import type { ContributionInfo } from '@/types/core'
import { useContributionsQuery } from '@/composables/queries'
import { formatContributionTime } from '@/utils/time'

const props = defineProps<{ id: number, type: 'album' | 'song' }>()
const { data, isLoading, isError, refetch } = useContributionsQuery(
  computed(() => props.id),
  computed(() => props.type),
)
const selected = ref<ContributionInfo['items'][number] | null>(null)
const detailVisible = ref(false)

function showDetail(item: ContributionInfo['items'][number]) {
  selected.value = item
  detailVisible.value = true
}

watch(() => [props.id, props.type], () => {
  detailVisible.value = false
  selected.value = null
})
</script>

<template>
  <section class="p-4 bg-black/5 dark:bg-white/5 rounded-xl h-fit">
    <h2 class="font-semibold mb-3">
      贡献信息
    </h2>
    <div v-if="isLoading" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" role="status">
      <LucideLoader2 class="size-4 animate-spin" />
      加载中...
    </div>
    <div v-else-if="isError" class="text-sm text-gray-500 dark:text-gray-400">
      加载失败
      <button class="ml-2 text-blue-500 hover:text-blue-600" type="button" @click="refetch()">
        重试
      </button>
    </div>
    <template v-else-if="data">
      <p class="text-sm mb-3">
        总编辑次数：{{ data.total }}
      </p>
      <p v-if="!data.items.length" class="text-sm text-gray-500 dark:text-gray-400">
        暂无贡献记录
      </p>
      <template v-else>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          最新编辑
        </p>
        <ul class="space-y-3">
          <li v-for="item in data.items" :key="item.id" class="text-sm min-w-0 break-words [overflow-wrap:anywhere]">
            <span class="font-medium mr-2">{{ item.username }}</span>
            <time :datetime="item.createdAt" class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap mr-2">
              {{ formatContributionTime(item.createdAt) }}
            </time>
            <span class="text-gray-500 dark:text-gray-400 mr-2">
              {{ item.summary.trim() || '未提供编辑摘要' }}
            </span>
            <button type="button" class="text-xs text-blue-500 hover:text-blue-600 whitespace-nowrap" @click="showDetail(item)">
              查看详情
            </button>
          </li>
        </ul>
      </template>
    </template>
    <AppDialog v-model="detailVisible" title="贡献详情" size="md">
      <div v-if="selected" class="p-6 max-h-[65vh] overflow-y-auto text-sm break-words [overflow-wrap:anywhere]">
        <div class="flex flex-wrap items-baseline gap-2 mb-3">
          <span class="font-medium">{{ selected.username }}</span>
          <time :datetime="selected.createdAt" class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatContributionTime(selected.createdAt) }}
          </time>
        </div>
        <p class="font-medium mb-3">
          {{ selected.summary }}
        </p>
        <p class="whitespace-pre-wrap text-gray-600 dark:text-gray-300">
          {{ selected.detail?.trim() || '暂无贡献详情' }}
        </p>
      </div>
    </AppDialog>
  </section>
</template>

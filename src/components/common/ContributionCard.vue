<script setup lang="ts">
import { useContributionsQuery } from '@/composables/queries'

const props = defineProps<{ id: number, type: 'album' | 'song' }>()
const { data, isLoading, isError, refetch } = useContributionsQuery(
  computed(() => props.id),
  computed(() => props.type),
)
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
            <div class="font-medium">
              {{ item.username }}
            </div>
            <p class="mt-1 text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
              {{ item.summary.trim() || '未提供编辑摘要' }}
            </p>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

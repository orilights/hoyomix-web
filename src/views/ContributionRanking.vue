<script setup lang="ts">
import type { ContributionRankingPeriod } from '@/types/core'
import { useContributionRankingQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { useMainStore } from '@/store/main'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const periods: { key: ContributionRankingPeriod, label: string }[] = [
  { key: '30d', label: '月榜' },
  { key: '365d', label: '年榜' },
  { key: 'all', label: '总榜' },
]
const period = computed<ContributionRankingPeriod>({
  get: () => periods.find(option => option.key === route.query.tab)?.key ?? '30d',
  set: (tab) => { void router.push({ query: { ...route.query, tab } }) },
})
const { data, isPending, isError, refetch } = useContributionRankingQuery(period)
const rangeLabel = computed(() => period.value === 'all' ? '全部历史贡献' : `最近 ${period.value === '30d' ? 30 : 365} 天的贡献`)
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

usePageSeo({ title: '贡献榜', description: '数据库贡献榜单', path: '/contribution-ranking' })
onMounted(() => store.setBackground())
</script>

<template>
  <div>
    <PageHeader title="贡献榜" subtitle="数据库贡献榜单" />
    <SegmentSwitch v-model="period" :options="periods" />
    <div class="my-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
      <p v-if="data" class="text-xs">
        <template v-if="data.startAt">
          {{ formatDate(data.startAt) }} 至
        </template>
        <template v-else>
          统计截至
        </template>
        {{ formatDate(data.endAt) }}
      </p>
    </div>
    <AsyncFade>
      <div v-if="isPending" class="flex items-center justify-center py-20 text-gray-400" role="status">
        <LucideLoader2 class="size-6 animate-spin mr-2" />
        加载中...
      </div>
      <div v-else-if="isError" class="flex flex-col items-center gap-3 py-20 text-gray-500 dark:text-gray-400" role="alert">
        <p>贡献榜加载失败</p>
        <AppButton @click="refetch()">
          重试
        </AppButton>
      </div>
      <div v-else-if="!data?.items.length" class="py-20 text-center text-gray-500 dark:text-gray-400">
        暂无贡献记录
      </div>
      <div v-else class="bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden">
        <table class="w-full table-fixed text-sm">
          <caption class="sr-only">
            {{ rangeLabel }}排名
          </caption>
          <thead class="text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
            <tr>
              <th scope="col" class="w-16 sm:w-20 px-3 py-3 text-center font-medium">
                排名
              </th>
              <th scope="col" class="px-3 py-3 text-left font-medium">
                贡献者
              </th>
              <th scope="col" class="w-24 sm:w-32 px-4 py-3 text-right font-medium">
                贡献次数
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.items" :key="item.userId" class="border-b last:border-b-0 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <td class="px-3 py-4 text-center font-semibold tabular-nums" :class="item.rank <= 3 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'">
                {{ item.rank }}
              </td>
              <th scope="row" class="px-3 py-4 text-left font-medium break-words [overflow-wrap:anywhere]">
                {{ item.username }}
              </th>
              <td class="px-4 py-4 text-right tabular-nums">
                {{ item.count.toLocaleString('zh-CN') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AsyncFade>
  </div>
</template>

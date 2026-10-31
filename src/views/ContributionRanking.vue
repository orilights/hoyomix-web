<script setup lang="ts">
import type { ContributionRankingPeriod } from '@/types/core'
import { useContributionRankingQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { formatNumber, t } from '@/i18n'
import { useMainStore } from '@/store/main'
import { formatDateTime } from '@/utils/time'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const periods: { key: ContributionRankingPeriod, label: string }[] = [
  { key: '30d', get label() {
    return t('ContributionRanking.monthly')
  } },
  { key: '365d', get label() {
    return t('ContributionRanking.yearly')
  } },
  { key: 'all', get label() {
    return t('ContributionRanking.all_time')
  } },
]
const period = computed<ContributionRankingPeriod>({
  get: () => periods.find(option => option.key === route.query.tab)?.key ?? '30d',
  set: (tab) => { void router.push({ query: { ...route.query, tab } }) },
})
const { data, isPending, isError, refetch } = useContributionRankingQuery(period)
const rangeLabel = computed(() => period.value === 'all' ? t('ContributionRanking.all_contributions') : t('ContributionRanking.contributions_in_the_last_days', { p0: period.value === '30d' ? 30 : 365 }))
const formatDate = (value: string) => formatDateTime(value)

usePageSeo({ title: () => t('DesktopSidebar.contributors'), description: () => t('ContributionRanking.database_contributors'), path: '/contribution-ranking' })
onMounted(() => store.setBackground())
</script>

<template>
  <div>
    <PageHeader :title="t('DesktopSidebar.contributors')" :subtitle="t('ContributionRanking.database_contributors')" />
    <SegmentSwitch v-model="period" :options="periods" />
    <div class="my-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
      <p v-if="data" class="text-xs">
        <template v-if="data.startAt">
          {{ t('ContributionRanking.to', { p0: formatDate(data.startAt) }) }}
        </template>
        <template v-else>
          {{ t('ContributionRanking.as_of') }}
        </template>
        {{ formatDate(data.endAt) }}
      </p>
    </div>
    <AsyncFade>
      <PageLoading v-if="isPending" />
      <div v-else-if="isError" class="flex flex-col items-center gap-3 py-20 text-gray-500 dark:text-gray-400" role="alert">
        <p>{{ t('ContributionRanking.failed_to_load_contributors') }}</p>
        <AppButton @click="refetch()">
          {{ t('App.retry') }}
        </AppButton>
      </div>
      <div v-else-if="!data?.items.length" class="py-20 text-center text-gray-500 dark:text-gray-400">
        {{ t('ContributionRanking.no_contributions_yet') }}
      </div>
      <div v-else class="bg-black/5 dark:bg-white/5 rounded-xl pt-2 pb-4 overflow-hidden">
        <table class="w-full table-fixed">
          <caption class="sr-only">
            {{ t('ContributionRanking.rank', { p0: rangeLabel }) }}
          </caption>
          <thead>
            <tr class="text-left">
              <th scope="col" class="w-[56px] p-2 text-center">
                #
              </th>
              <th scope="col" class="p-2">
                {{ t('ContributionRanking.contributor') }}
              </th>
              <th scope="col" class="w-[150px] p-2">
                {{ t('ContributionRanking.contributions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.items" :key="item.userId">
              <td class="p-2 text-center text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                <span
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                >
                  {{ item.rank }}
                </span>
              </td>
              <th scope="row" class="p-2 text-sm text-left font-medium break-words [overflow-wrap:anywhere]">
                {{ item.username }}
              </th>
              <td class="p-2 text-sm tabular-nums">
                {{ formatNumber(item.count) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AsyncFade>
  </div>
</template>

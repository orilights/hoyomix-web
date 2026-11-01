<script setup lang="ts">
import type { EditRequestParams } from '@/types/edit-request'
import { useMyEditRequestsQuery } from '@/composables/queries'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { editRequestColors as colors, editRequestLabels as labels } from '@/utils/edit-request'
import { formatDateTime } from '@/utils/time'

const props = withDefaults(defineProps<{ params: EditRequestParams, showResource?: boolean }>(), { showResource: false })
const emit = defineEmits<{ page: [value: number] }>()
const auth = useAuthStore()
const { data, isPending, isError, error, refetch, isFetching } = useMyEditRequestsQuery(computed(() => props.params))
const selectedId = ref<number | null>(null)
const page = computed(() => props.params.page ?? 1)
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.limit ?? props.params.limit ?? 10))))

watch(data, (value) => {
  if (value && page.value > pages.value)
    emit('page', pages.value)
})
watch(() => [props.params, auth.user?.id], () => {
  selectedId.value = null
})
</script>

<template>
  <div class="space-y-4">
    <AsyncFade>
      <div v-if="isPending" key="loading" class="flex items-center justify-center py-8 text-gray-400" role="status">
        <LucideLoader2 class="size-6 animate-spin mr-2" />{{ t('App.loading') }}
      </div>
      <div v-else-if="isError" key="error" class="flex flex-wrap items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500 dark:text-gray-400" role="alert">
        {{ error?.message || t('EditRequestList.failed_to_load_requests') }}
        <AppButton size="sm" variant="ghost" @click="refetch()">
          {{ t('App.retry') }}
        </AppButton>
      </div>
      <p v-else-if="data && !data.items.length" key="empty" class="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {{ t('EditRequestList.no_edit_requests_yet') }}
      </p>
      <div v-else-if="data" key="list" class="space-y-4">
        <ul class="space-y-3">
          <li v-for="item in data.items" :key="item.id" class="relative rounded-xl bg-black/5 dark:bg-white/5 text-sm min-w-0 break-words [overflow-wrap:anywhere]">
            <button type="button" class="absolute inset-0 rounded-xl cursor-pointer transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-blue-500" :aria-label="t('EditRequestList.view_request_details', { p0: item.summary })" aria-haspopup="dialog" @click="selectedId = item.id" />
            <div class="p-4 pointer-events-none">
              <div class="flex flex-wrap gap-2 items-center mb-2">
                <span class="text-xs rounded px-2 py-0.5" :class="colors[item.status]">{{ labels[item.status] }}</span>
                <time :datetime="item.createdAt" class="text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(item.createdAt) }}</time>
              </div>
              <div v-if="showResource" class="font-medium mb-2">
                <RouterLink v-if="item.resourcePath" :to="item.resourcePath" class="relative pointer-events-auto text-blue-500 hover:text-blue-600">
                  {{ item.resourceName }}
                </RouterLink>
                <span v-else>{{ t('EditRequestDetailDialog.resource_deleted', { p0: item.resourceName }) }}</span>
              </div>
              <p>{{ item.summary }}</p>
            </div>
          </li>
        </ul>
        <div v-if="data.total" class="flex flex-wrap items-center justify-center gap-3 text-sm">
          <Pagination
            :model-value="page"
            :total-pages="pages"
            :disabled="isFetching"
            :aria-label="t('EditRequestList.edit_request_pages')"
            @update:model-value="emit('page', $event)"
          />
          <span class="text-gray-500 dark:text-gray-400">{{ t('EditRequestList.record_in_total', { p0: data.total }, Number(data.total)) }}</span>
        </div>
      </div>
    </AsyncFade>
    <EditRequestDetailDialog v-model="selectedId" />
  </div>
</template>

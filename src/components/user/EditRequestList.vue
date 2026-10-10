<script setup lang="ts">
import type { EditRequestParams, EditRequestStatus } from '@/types/edit-request'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { cancelEditRequestApi } from '@/api/music'
import { useEditRequestQuery, useMyEditRequestsQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'
import { formatContributionTime } from '@/utils/time'

const props = withDefaults(defineProps<{ params: EditRequestParams, showResource?: boolean }>(), { showResource: false })
const emit = defineEmits<{ page: [value: number] }>()
const auth = useAuthStore()
const queryClient = useQueryClient()
const { data, isPending, isError, error, refetch, isFetching } = useMyEditRequestsQuery(computed(() => props.params))
const expandedId = ref<number | null>(null)
const { data: detail, isPending: detailPending, isError: detailError, refetch: retryDetail } = useEditRequestQuery(expandedId)
const cancelId = ref<number | null>(null)
const cancelling = ref(false)
const showCancel = computed({
  get: () => cancelId.value !== null,
  set: (value: boolean) => {
    if (!value && !cancelling.value)
      cancelId.value = null
  },
})
const labels: Record<EditRequestStatus, string> = { pending: '审核中', approved: '已通过', rejected: '已驳回', cancelled: '已取消' }
const colors: Record<EditRequestStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
  cancelled: 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400',
}
const page = computed(() => props.params.page ?? 1)
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (props.params.limit ?? 20))))

watch(data, (value) => {
  if (value && page.value > pages.value)
    emit('page', pages.value)
})
watch(() => [props.params, auth.user?.id], () => {
  expandedId.value = null
  cancelId.value = null
})

async function cancel() {
  if (cancelId.value === null || cancelling.value)
    return
  const id = cancelId.value
  const userId = auth.user?.id
  cancelling.value = true
  try {
    await cancelEditRequestApi(id)
    if (auth.user?.id === userId) {
      toast.success('已取消编辑申请')
      cancelId.value = null
    }
  }
  catch (error) {
    if (auth.user?.id === userId)
      toast.error(error instanceof Error ? error.message : '取消失败')
  }
  finally {
    cancelling.value = false
    // 审核可能与取消同时完成，成功或失败均重新读取服务器状态。
    if (auth.user?.id === userId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['editRequests'] }),
        queryClient.invalidateQueries({ queryKey: ['editRequestDetail'] }),
      ])
      if (data.value?.items.find(item => item.id === id)?.status !== 'pending')
        cancelId.value = null
    }
  }
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="isPending" class="text-sm text-gray-500 flex items-center gap-2" role="status">
      <LucideLoader2 class="size-4 animate-spin" />加载中...
    </p>
    <div v-else-if="isError" class="text-sm text-gray-500 dark:text-gray-400">
      {{ error?.message || '申请记录加载失败' }}
      <AppButton size="sm" variant="ghost" @click="refetch()">
        重试
      </AppButton>
    </div>
    <template v-else-if="data">
      <p v-if="!data.items.length" class="text-sm text-gray-500 dark:text-gray-400">
        暂无编辑申请记录
      </p>
      <ul v-else class="space-y-3">
        <li v-for="item in data.items" :key="item.id" class="p-4 rounded-xl bg-black/5 dark:bg-white/5 text-sm min-w-0 break-words [overflow-wrap:anywhere]">
          <div class="flex flex-wrap gap-2 items-center mb-2">
            <span class="text-xs rounded px-2 py-0.5" :class="colors[item.status]">{{ labels[item.status] }}</span>
            <time :datetime="item.createdAt" class="text-xs text-gray-500 dark:text-gray-400">{{ formatContributionTime(item.createdAt) }}</time>
          </div>
          <div v-if="showResource" class="font-medium mb-2">
            <RouterLink v-if="item.resourcePath" :to="item.resourcePath" class="text-blue-500 hover:text-blue-600">
              {{ item.resourceName }}
            </RouterLink>
            <span v-else>{{ item.resourceName }}（资源已删除）</span>
          </div>
          <p>{{ item.summary }}</p>
          <p v-if="item.status === 'rejected'" class="mt-2 text-red-600 dark:text-red-400 whitespace-pre-wrap">
            驳回原因：{{ item.reason?.trim() || '未提供驳回原因' }}
          </p>
          <div class="flex flex-wrap gap-2 mt-3">
            <AppButton size="xs" variant="ghost" :aria-expanded="expandedId === item.id" @click="expandedId = expandedId === item.id ? null : item.id">
              {{ expandedId === item.id ? '收起详情' : '查看详情' }}
            </AppButton>
            <AppButton v-if="item.status === 'pending'" size="xs" variant="danger" :disabled="cancelling" @click="cancelId = item.id">
              取消申请
            </AppButton>
          </div>
          <div v-if="expandedId === item.id" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 whitespace-pre-wrap text-gray-600 dark:text-gray-300">
            <p v-if="detailPending" role="status">
              加载中...
            </p>
            <div v-else-if="detailError">
              详情加载失败 <AppButton size="xs" @click="retryDetail()">
                重试
              </AppButton>
            </div>
            <p v-else>
              {{ detail?.detail || '暂无修改明细' }}
            </p>
          </div>
        </li>
      </ul>
      <div v-if="data.total" class="flex flex-wrap items-center justify-center gap-3 text-sm">
        <AppButton size="sm" :disabled="page <= 1 || isFetching" @click="emit('page', page - 1)">
          上一页
        </AppButton>
        <span>{{ page }} / {{ pages }} · 共 {{ data.total }} 条</span>
        <AppButton size="sm" :disabled="page >= pages || isFetching" @click="emit('page', page + 1)">
          下一页
        </AppButton>
      </div>
    </template>
    <AppDialog v-model="showCancel" title="取消编辑申请">
      <div class="p-6 text-sm">
        确认取消这条审核中的申请？取消后将保留历史记录。
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 p-4">
          <AppButton :disabled="cancelling" @click="showCancel = false">
            返回
          </AppButton>
          <AppButton variant="danger" :disabled="cancelling" @click="cancel">
            {{ cancelling ? '取消中...' : '确认取消' }}
          </AppButton>
        </div>
      </template>
    </AppDialog>
  </div>
</template>

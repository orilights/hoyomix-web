<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { cancelEditRequestApi } from '@/api/music'
import { useEditRequestQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'
import { editRequestColors, editRequestLabels } from '@/utils/edit-request'
import { formatDateTime } from '@/utils/time'

const id = defineModel<number | null>({ required: true })
const auth = useAuthStore()
const queryClient = useQueryClient()
const { data: detail, isPending, isError, error, refetch } = useEditRequestQuery(id)
const visible = computed({ get: () => id.value !== null, set: (value: boolean) => {
  if (!value)
    id.value = null
} })
const confirmCancel = ref(false)
const cancelling = ref(false)
watch(id, () => {
  confirmCancel.value = false
})
watch(() => auth.user?.id, () => {
  id.value = null
}, { flush: 'sync' })

async function cancel() {
  if (id.value === null || cancelling.value || detail.value?.status !== 'pending')
    return
  const requestId = id.value
  const userId = auth.user?.id
  cancelling.value = true
  try {
    await cancelEditRequestApi(requestId)
    if (auth.user?.id === userId && id.value === requestId) {
      toast.success('已取消编辑申请')
      confirmCancel.value = false
    }
  }
  catch (error) {
    if (auth.user?.id === userId && id.value === requestId)
      toast.error(error instanceof Error ? error.message : '取消失败')
  }
  finally {
    if (auth.user?.id === userId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['editRequests'] }),
        queryClient.invalidateQueries({ queryKey: ['editRequestDetail'] }),
      ])
      if (id.value === requestId && detail.value?.status !== 'pending')
        confirmCancel.value = false
    }
    cancelling.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" title="编辑申请详情" size="md">
    <div class="p-4 sm:p-6 max-h-[65vh] overflow-y-auto overscroll-contain space-y-4 text-sm break-words [overflow-wrap:anywhere]">
      <AsyncFade>
        <p v-if="isPending" class="text-center" role="status">
          加载中...
        </p>
        <div v-else-if="isError">
          {{ error?.message || '详情加载失败' }}
          <AppButton size="sm" variant="ghost" @click="refetch()">
            重试
          </AppButton>
        </div>
        <div v-else-if="detail" class="space-y-4">
          <div>
            <RouterLink v-if="detail.resourcePath" :to="detail.resourcePath" class="text-blue-500" @click="visible = false">
              {{ detail.resourceName }}
            </RouterLink>
            <span v-else>{{ detail.resourceName }}（资源已删除）</span>
          </div>
          <span class="inline-block text-xs rounded px-2 py-0.5" :class="editRequestColors[detail.status]">{{ editRequestLabels[detail.status] }}</span>
          <p>提交时间：<time :datetime="detail.createdAt">{{ formatDateTime(detail.createdAt) }}</time></p>
          <p>更新时间：<time :datetime="detail.updatedAt">{{ formatDateTime(detail.updatedAt) }}</time></p>
          <div>
            <p class="font-medium mb-1">
              变更摘要
            </p><p>{{ detail.summary }}</p>
          </div>
          <div>
            <p class="font-medium mb-1">
              变更明细
            </p><p class="whitespace-pre-wrap">
              {{ detail.detail || '暂无修改明细' }}
            </p>
          </div>
          <p v-if="detail.status === 'rejected'" class="text-red-600 dark:text-red-400 whitespace-pre-wrap">
            驳回原因：{{ detail.reason?.trim() || '未提供驳回原因' }}
          </p>
        </div>
      </AsyncFade>
    </div>
    <template v-if="!isError && detail?.status === 'pending'" #footer>
      <div class="p-4 flex justify-end">
        <AppButton variant="danger" :disabled="cancelling" @click="confirmCancel = true">
          取消申请
        </AppButton>
      </div>
    </template>
  </AppDialog>
  <AppDialog v-model="confirmCancel" title="取消编辑申请">
    <div class="p-6 text-sm">
      确认取消这条审核中的申请？取消后将保留历史记录。
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 p-4">
        <AppButton :disabled="cancelling" @click="confirmCancel = false">
          返回
        </AppButton>
        <AppButton variant="danger" :disabled="cancelling" @click="cancel">
          {{ cancelling ? '取消中...' : '确认取消' }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { cancelEditRequestApi } from '@/api/music'
import { useEditRequestQuery } from '@/composables/queries'
import { t } from '@/i18n'
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
      toast.success(t('EditRequestDetailDialog.edit_request_cancelled'))
      confirmCancel.value = false
    }
  }
  catch (error) {
    if (auth.user?.id === userId && id.value === requestId)
      toast.error(error instanceof Error ? error.message : t('EditRequestDetailDialog.cancellation_failed'))
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
  <AppDialog v-model="visible" :title="t('EditRequestDetailDialog.edit_request_details')" size="md">
    <div class="p-4 sm:p-6 max-h-[65vh] overflow-y-auto overscroll-contain space-y-4 text-sm break-words [overflow-wrap:anywhere]">
      <AsyncFade>
        <p v-if="isPending" class="text-center" role="status">
          {{ t('App.loading') }}
        </p>
        <div v-else-if="isError">
          {{ error?.message || t('EditRequestDetailDialog.failed_to_load_details') }}
          <AppButton size="sm" variant="ghost" @click="refetch()">
            {{ t('App.retry') }}
          </AppButton>
        </div>
        <div v-else-if="detail" class="space-y-4">
          <div>
            <RouterLink v-if="detail.resourcePath" :to="detail.resourcePath" class="text-blue-500" @click="visible = false">
              {{ detail.resourceName }}
            </RouterLink>
            <span v-else>{{ t('EditRequestDetailDialog.resource_deleted', { p0: detail.resourceName }) }}</span>
          </div>
          <span class="inline-block text-xs rounded px-2 py-0.5" :class="editRequestColors[detail.status]">{{ editRequestLabels[detail.status] }}</span>
          <p>{{ t('EditRequestDetailDialog.submitted') }}<time :datetime="detail.createdAt">{{ formatDateTime(detail.createdAt) }}</time></p>
          <p>{{ t('EditRequestDetailDialog.updated') }}<time :datetime="detail.updatedAt">{{ formatDateTime(detail.updatedAt) }}</time></p>
          <div>
            <p class="font-medium mb-1">
              {{ t('EditRequestDetailDialog.change_summary') }}
            </p><p>{{ detail.summary }}</p>
          </div>
          <div>
            <p class="font-medium mb-1">
              {{ t('EditRequestDetailDialog.change_details') }}
            </p><p class="whitespace-pre-wrap">
              {{ detail.detail || t('EditRequestDetailDialog.no_change_details') }}
            </p>
          </div>
          <p v-if="detail.status === 'rejected'" class="text-red-600 dark:text-red-400 whitespace-pre-wrap">
            {{ t('EditRequestDetailDialog.rejection_reason', { p0: detail.reason?.trim() || t('EditRequestDetailDialog.no_rejection_reason_provided') }) }}
          </p>
        </div>
      </AsyncFade>
    </div>
    <template v-if="!isError && detail?.status === 'pending'" #footer>
      <div class="p-4 flex justify-end">
        <AppButton variant="danger" :disabled="cancelling" @click="confirmCancel = true">
          {{ t('EditRequestDetailDialog.cancel_request') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
  <AppDialog v-model="confirmCancel" :title="t('EditRequestDetailDialog.cancel_edit_request')">
    <div class="p-6 text-sm">
      {{ t('EditRequestDetailDialog.cancel_this_pending_request_the_history_will_be_kept') }}
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 p-4">
        <AppButton :disabled="cancelling" @click="confirmCancel = false">
          {{ t('PlayerSleepTimer.back') }}
        </AppButton>
        <AppButton variant="danger" :disabled="cancelling" @click="cancel">
          {{ cancelling ? t('Playlist.cancelling') : t('EditRequestDetailDialog.confirm_cancellation') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

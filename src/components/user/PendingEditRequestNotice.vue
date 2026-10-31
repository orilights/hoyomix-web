<script setup lang="ts">
import type { EditRequestItem } from '@/types/edit-request'
import { t } from '@/i18n'

defineProps<{ pendingRequest: EditRequestItem | null, checking: boolean, checkError: boolean }>()
const emit = defineEmits<{ retry: [] }>()
const selectedId = ref<number | null>(null)
</script>

<template>
  <div class="px-3 py-2 rounded-lg bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 text-xs leading-relaxed" role="status">
    <AsyncFade>
      <div v-if="checking">
        {{ t('PendingEditRequestNotice.checking_pending_requests') }}
      </div>
      <div v-else-if="checkError">
        {{ t('PendingEditRequestNotice.unable_to_load_request_status_submission_is_temporarily_unavailable') }}<AppButton size="xs" variant="ghost" @click="emit('retry')">
          {{ t('App.retry') }}
        </AppButton>
      </div>
      <div v-else-if="pendingRequest">
        {{ t('PendingEditRequestNotice.a_request_is_pending_review_another_request_cannot_be') }}<AppButton size="xs" variant="ghost" @click="selectedId = pendingRequest.id">
          {{ t('ContributionCard.view_details') }}
        </AppButton>
      </div>
      <div v-else>
        {{ t('SongVideoEditDialog.changes_take_effect_after_review_only_one_pending_request') }}
      </div>
    </AsyncFade>
  </div>
  <EditRequestDetailDialog v-model="selectedId" />
</template>

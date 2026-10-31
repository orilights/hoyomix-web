<script setup lang="ts">
import type { EditRequestStatus } from '@/types/edit-request'
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
usePageSeo({ title: () => t('EditRequests.my_edit_requests'), path: '/edit-requests', noindex: true })
const statuses = ['pending', 'approved', 'rejected', 'cancelled'] as const
const status = computed(() => statuses.includes(route.query.status as EditRequestStatus) ? route.query.status as EditRequestStatus : undefined)
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
})
const params = computed(() => ({ status: status.value, page: page.value, limit: 10 }))
const options = [
  { value: '', get label() {
    return t('search.all')
  } },
  { value: 'pending', get label() {
    return t('MusicActions.pending_review')
  } },
  { value: 'approved', get label() {
    return t('edit_request.approved')
  } },
  { value: 'rejected', get label() {
    return t('edit_request.rejected')
  } },
  { value: 'cancelled', get label() {
    return t('edit_request.cancelled')
  } },
]
function setStatus(value: string) {
  void router.replace({ query: { ...route.query, status: value || undefined, page: undefined } })
}
function setPage(value: number) {
  void router.replace({ query: { ...route.query, page: value > 1 ? String(value) : undefined } })
}
</script>

<template>
  <div class="py-4">
    <PageHeader :title="t('EditRequests.my_edit_requests')" :subtitle="t('EditRequests.database_edit_request_history')" />
    <AsyncFade>
      <div v-if="auth.isPending" class="flex items-center justify-center py-8 text-gray-400" role="status">
        <LucideLoader2 class="size-6 animate-spin mr-2" />{{ t('App.loading') }}
      </div>
      <div v-else-if="!auth.isLoggedIn" class="py-12 text-center">
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          {{ t('EditRequests.sign_in_to_view_your_edit_requests') }}
        </p>
        <AppButton variant="primary" @click="auth.openAuthDialog()">
          {{ t('DesktopSidebar.sign_in') }}
        </AppButton>
      </div>
      <div v-else>
        <div class="flex flex-wrap gap-2 my-4" :aria-label="t('EditRequests.filter_by_request_status')">
          <AppButton v-for="option in options" :key="option.value" size="sm" :variant="(status ?? '') === option.value ? 'primary' : 'secondary'" :aria-pressed="(status ?? '') === option.value" @click="setStatus(option.value)">
            {{ option.label }}
          </AppButton>
        </div>
        <EditRequestList :params="params" show-resource @page="setPage" />
      </div>
    </AsyncFade>
  </div>
</template>

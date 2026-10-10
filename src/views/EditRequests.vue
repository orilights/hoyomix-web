<script setup lang="ts">
import type { EditRequestStatus } from '@/types/edit-request'
import { usePageSeo } from '@/composables/usePageSeo'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
usePageSeo({ title: '我的编辑申请', path: '/edit-requests', noindex: true })
const statuses = ['pending', 'approved', 'rejected', 'cancelled'] as const
const status = computed(() => statuses.includes(route.query.status as EditRequestStatus) ? route.query.status as EditRequestStatus : undefined)
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
})
const params = computed(() => ({ status: status.value, page: page.value, limit: 20 }))
const options = [
  { value: '', label: '全部' },
  { value: 'pending', label: '审核中' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'cancelled', label: '已取消' },
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
    <PageHeader title="我的编辑申请" subtitle="查看提交记录、审核结果与驳回原因" />
    <p v-if="auth.isPending" class="py-8 text-gray-500" role="status">
      加载中...
    </p>
    <div v-else-if="!auth.isLoggedIn" class="py-12 text-center">
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        登录后查看自己的编辑申请记录
      </p>
      <AppButton variant="primary" @click="auth.openAuthDialog()">
        登录
      </AppButton>
    </div>
    <template v-else>
      <div class="flex flex-wrap gap-2 my-4" aria-label="申请状态筛选">
        <AppButton v-for="option in options" :key="option.value" size="sm" :variant="(status ?? '') === option.value ? 'primary' : 'secondary'" :aria-pressed="(status ?? '') === option.value" @click="setStatus(option.value)">
          {{ option.label }}
        </AppButton>
      </div>
      <EditRequestList :params="params" show-resource @page="setPage" />
    </template>
  </div>
</template>

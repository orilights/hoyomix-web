<script setup lang="ts">
import type { EditResourceType } from '@/types/edit-request'
import { useMyEditRequestsQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'

const props = defineProps<{ resourceType: EditResourceType, resourceId: number }>()
const auth = useAuthStore()
const visible = ref(false)
const page = ref(1)
const enabled = computed(() => !!props.resourceId)
const params = computed(() => ({ resourceType: props.resourceType, resourceId: props.resourceId, status: 'pending,rejected' as const, limit: 1 }))
const { data, isError, isPending, refetch } = useMyEditRequestsQuery(params, enabled)
const listParams = computed(() => ({ ...params.value, page: page.value, limit: 20 }))
watch(() => [auth.user?.id, props.resourceType, props.resourceId], () => {
  visible.value = false
  page.value = 1
})

function open() {
  page.value = 1
  visible.value = true
}
</script>

<template>
  <div v-if="auth.isLoggedIn && !auth.isPending && resourceId && (isError || isPending || data?.total)" class="mt-2">
    <AppButton v-if="isError" size="xs" variant="ghost" @click="refetch()">
      申请记录加载失败，点击重试
    </AppButton>
    <span v-else-if="isPending" class="text-xs text-gray-500 dark:text-gray-400" role="status">申请记录加载中...</span>
    <AppButton v-else size="xs" variant="ghost" @click="open">
      <LucideClipboardList class="size-4" />我的编辑申请（{{ data?.total }}）
    </AppButton>
  </div>
  <AppDialog v-model="visible" title="我的编辑申请" size="md">
    <div class="p-4 sm:p-6 max-h-[65vh] overflow-y-auto overscroll-contain">
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
        当前资源的审核中与已驳回记录
      </p>
      <EditRequestList v-if="visible" :params="listParams" @page="page = $event" />
    </div>
  </AppDialog>
</template>

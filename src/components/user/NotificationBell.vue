<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { getNotificationUnreadCountApi } from '@/api/notification'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const { isLoggedIn } = storeToRefs(auth)

const showNotificationDialog = ref(false)

const { data: unreadCountData } = useQuery({
  queryKey: ['notificationUnreadCount'],
  queryFn: getNotificationUnreadCountApi,
  enabled: isLoggedIn,
  refetchInterval: 60 * 1000,
  staleTime: 30 * 1000,
  // 未读计数轮询失败时静默处理，避免反复打扰用户
  retry: false,
})

const hasUnread = computed(() => (unreadCountData.value?.count ?? 0) > 0)
</script>

<template>
  <Tooltip v-if="isLoggedIn" content="站内信" placement="bottom" align="center">
    <AppButton
      icon-only
      shape="pill"
      class="relative"
      aria-label="站内信"
      @click="showNotificationDialog = true"
    >
      <LucideBell class="size-4.5" />
      <span
        v-if="hasUnread"
        class="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full ring-2 ring-white pointer-events-none"
      />
    </AppButton>
  </Tooltip>
  <NotificationDialog v-if="isLoggedIn" v-model="showNotificationDialog" />
</template>

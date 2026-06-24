<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { getNotificationUnreadCountApi } from '@/api/music'
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
  <button
    v-if="isLoggedIn"
    class="relative text-sm bg-gray-500/10 p-2 rounded-full hover:bg-gray-500/20 transition-colors cursor-pointer"
    title="站内信"
    @click="showNotificationDialog = true"
  >
    <LucideBell class="size-4.5" />
    <span
      v-if="hasUnread"
      class="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full ring-2 ring-white pointer-events-none"
    />
  </button>
  <NotificationDialog v-if="isLoggedIn" v-model="showNotificationDialog" />
</template>

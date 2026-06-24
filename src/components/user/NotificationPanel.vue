<script setup lang="ts">
import type { Notification } from '@/types/notification'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import {
  deleteNotificationApi,
  deleteReadNotificationsApi,
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '@/api/music'
import { formatRelativeTime } from '@/utils'

const emit = defineEmits<{
  unreadCountChange: [count: number]
}>()

const queryClient = useQueryClient()

const loading = ref(false)
const notifications = ref<Notification[]>([])
const total = ref(0)
const unreadCount = ref(0)
const page = ref(1)

const hasMore = computed(() => notifications.value.length < total.value)

async function fetchNotifications(reset = false) {
  if (reset) {
    page.value = 1
    notifications.value = []
  }
  loading.value = true
  try {
    const res = await getNotificationsApi(page.value, 20)
    if (page.value === 1) {
      notifications.value = res.items
    }
    else {
      notifications.value.push(...res.items)
    }
    total.value = res.total
    unreadCount.value = res.unreadCount
    emit('unreadCountChange', res.unreadCount)
  }
  finally {
    loading.value = false
  }
}

async function markRead(id: number) {
  const item = notifications.value.find(n => n.id === id)
  if (!item || item.isRead)
    return
  item.isRead = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  emit('unreadCountChange', unreadCount.value)
  await markNotificationReadApi(id)
  queryClient.setQueryData(['notificationUnreadCount'], { count: unreadCount.value })
}

async function markAllRead() {
  if (unreadCount.value === 0)
    return
  notifications.value.forEach(n => (n.isRead = true))
  unreadCount.value = 0
  emit('unreadCountChange', 0)
  await markAllNotificationsReadApi()
  queryClient.setQueryData(['notificationUnreadCount'], { count: 0 })
}

async function removeNotification(id: number) {
  const idx = notifications.value.findIndex(n => n.id === id)
  if (idx === -1)
    return
  const item = notifications.value[idx]
  if (!item.isRead) {
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    emit('unreadCountChange', unreadCount.value)
    queryClient.setQueryData(['notificationUnreadCount'], { count: unreadCount.value })
  }
  notifications.value.splice(idx, 1)
  total.value--
  await deleteNotificationApi(id)
}

async function deleteRead() {
  const readCount = notifications.value.filter(n => n.isRead).length
  if (readCount === 0) {
    toast.info('没有已读通知')
    return
  }
  notifications.value = notifications.value.filter(n => !n.isRead)
  total.value -= readCount
  await deleteReadNotificationsApi()
  toast.success('已删除已读通知')
}

async function loadMore() {
  page.value++
  await fetchNotifications()
}

onMounted(() => fetchNotifications(true))
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
      <span class="text-xs text-gray-400">
        {{ unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读通知' }}
      </span>
      <div class="flex gap-0.5">
        <button
          class="text-xs px-2 py-1 rounded transition-colors cursor-pointer"
          :class="unreadCount > 0 ? 'hover:bg-gray-100 text-gray-500' : 'opacity-40 cursor-not-allowed text-gray-400'"
          :disabled="unreadCount === 0"
          @click="markAllRead"
        >
          全部已读
        </button>
        <button
          class="text-xs px-2 py-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
          @click="deleteRead"
        >
          删除已读
        </button>
      </div>
    </div>

    <div class="overflow-y-auto max-h-72 overscroll-contain">
      <div v-if="loading && notifications.length === 0" class="py-10 text-center text-sm text-gray-400">
        加载中...
      </div>
      <div v-else-if="notifications.length === 0" class="py-10 text-center text-sm text-gray-400">
        暂无通知
      </div>
      <template v-else>
        <div
          v-for="n in notifications"
          :key="n.id"
          class="group flex items-start gap-2.5 px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
          :class="{ 'cursor-pointer': !n.isRead }"
          @click="markRead(n.id)"
        >
          <div class="mt-1.5 size-1.5 rounded-full shrink-0 transition-colors" :class="n.isRead ? 'bg-gray-200' : 'bg-blue-500'" />
          <div class="flex-1 min-w-0">
            <p class="text-sm leading-snug" :class="n.isRead ? 'text-gray-500' : 'font-medium text-gray-900'">
              {{ n.title }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
              {{ n.content }}
            </p>
            <p class="text-[11px] text-gray-300 mt-1">
              {{ formatRelativeTime(n.createdAt) }}
            </p>
          </div>
          <button
            class="size-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all shrink-0 mt-0.5 cursor-pointer"
            @click.stop="removeNotification(n.id)"
          >
            <LucideX class="size-3 text-gray-400" />
          </button>
        </div>
        <button
          v-if="hasMore"
          class="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          :disabled="loading"
          @click.stop="loadMore"
        >
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
      </template>
    </div>
  </div>
</template>

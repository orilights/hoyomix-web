<script setup lang="ts">
import type { AlbumInfo } from '@/types/core'
import type { CommentNotificationMetadata, Notification } from '@/types/notification'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { CommentApiError, getCommentLocationApi } from '@/api/comment'
import {
  deleteNotificationApi,
  deleteReadNotificationsApi,
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '@/api/notification'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { formatRelativeTime } from '@/utils'
import { getRememberedCommentRoute } from '@/utils/comment-route'

const emit = defineEmits<{
  unreadCountChange: [count: number]
  navigate: []
}>()

const queryClient = useQueryClient()
const route = useRoute()
const router = useRouter()
const player = usePlayerStore()

const loading = ref(false)
const loadError = ref(false)
const notifications = ref<Notification[]>([])
const total = ref(0)
const unreadCount = ref(0)
const page = ref(1)
const navigatingId = ref<number | null>(null)

const hasMore = computed(() => notifications.value.length < total.value)

async function fetchNotifications(reset = false) {
  if (reset) {
    page.value = 1
    notifications.value = []
  }
  loading.value = true
  loadError.value = false
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
  catch (e) {
    loadError.value = true
    // 加载更多失败时回滚页码，便于重试
    if (!reset)
      page.value--
    toast.error(t('NotificationPanel.failed_to_load_notifications', { p0: e instanceof Error ? e.message : t('App.unknown_error') }))
  }
  finally {
    loading.value = false
  }
}

async function markRead(id: number) {
  const item = notifications.value.find(n => n.id === id)
  if (!item || item.isRead)
    return
  const prevRead = item.isRead
  const prevUnread = unreadCount.value
  item.isRead = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  emit('unreadCountChange', unreadCount.value)
  try {
    await markNotificationReadApi(id)
    queryClient.setQueryData(['notificationUnreadCount'], { count: unreadCount.value })
  }
  catch (e) {
    // 回滚乐观更新
    item.isRead = prevRead
    unreadCount.value = prevUnread
    emit('unreadCountChange', prevUnread)
    toast.error(t('NotificationPanel.failed_to_mark_as_read', { p0: e instanceof Error ? e.message : t('App.unknown_error') }))
  }
}

async function markAllRead() {
  if (unreadCount.value === 0)
    return
  const prevUnread = unreadCount.value
  const prevReadMap = new Map(notifications.value.map(n => [n.id, n.isRead]))
  notifications.value.forEach(n => (n.isRead = true))
  unreadCount.value = 0
  emit('unreadCountChange', 0)
  try {
    await markAllNotificationsReadApi()
    queryClient.setQueryData(['notificationUnreadCount'], { count: 0 })
  }
  catch (e) {
    // 回滚乐观更新
    notifications.value.forEach(n => (n.isRead = prevReadMap.get(n.id) ?? n.isRead))
    unreadCount.value = prevUnread
    emit('unreadCountChange', prevUnread)
    toast.error(t('NotificationPanel.failed_to_mark_all_as_read', { p0: e instanceof Error ? e.message : t('App.unknown_error') }))
  }
}

async function removeNotification(id: number) {
  const idx = notifications.value.findIndex(n => n.id === id)
  if (idx === -1)
    return
  const item = notifications.value[idx]
  const wasUnread = !item.isRead
  const prevUnread = unreadCount.value
  if (wasUnread) {
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    emit('unreadCountChange', unreadCount.value)
  }
  notifications.value.splice(idx, 1)
  total.value--
  try {
    await deleteNotificationApi(id)
    if (wasUnread)
      queryClient.setQueryData(['notificationUnreadCount'], { count: unreadCount.value })
  }
  catch (e) {
    // 回滚：重新插入到原位置
    notifications.value.splice(idx, 0, item)
    total.value++
    if (wasUnread) {
      unreadCount.value = prevUnread
      emit('unreadCountChange', prevUnread)
    }
    toast.error(t('NotificationPanel.failed_to_delete_notification', { p0: e instanceof Error ? e.message : t('App.unknown_error') }))
  }
}

async function deleteRead() {
  const readCount = notifications.value.filter(n => n.isRead).length
  if (readCount === 0) {
    toast.info(t('NotificationPanel.no_read_notifications'))
    return
  }
  const removed = notifications.value.filter(n => n.isRead)
  notifications.value = notifications.value.filter(n => !n.isRead)
  total.value -= readCount
  try {
    await deleteReadNotificationsApi()
    toast.success(t('NotificationPanel.read_notifications_deleted'))
  }
  catch (e) {
    // 回滚：恢复已读通知
    notifications.value = [...notifications.value, ...removed]
    total.value += readCount
    toast.error(t('NotificationPanel.failed_to_delete_read_notifications', { p0: e instanceof Error ? e.message : t('App.unknown_error') }))
  }
}

async function loadMore() {
  page.value++
  await fetchNotifications()
}

function isCommentNotification(notification: Notification) {
  return notification.type === 'comment-approval' || notification.type === 'comment-reply'
}

function getCommentMetadata(notification: Notification): CommentNotificationMetadata | null {
  if (!isCommentNotification(notification))
    return null
  const { metadata } = notification
  if (
    typeof metadata.postId !== 'string'
    || typeof metadata.commentId !== 'string'
    || typeof metadata.threadId !== 'string'
    || !(metadata.replyTo === null || typeof metadata.replyTo === 'string')
  ) {
    return null
  }
  return metadata as unknown as CommentNotificationMetadata
}

function resolveCommentPath(postId: string) {
  const rememberedPath = getRememberedCommentRoute(postId)
  if (rememberedPath)
    return rememberedPath
  if (postId === 'hoyomix:feedback')
    return '/feedback'
  const match = /^hoyomix:(album|playlist|song):(.+)$/.exec(postId)
  if (!match)
    return null
  const [, type, id] = match
  if (type === 'album')
    return `/album/${encodeURIComponent(id!)}`
  if (type === 'playlist')
    return `/playlist/${encodeURIComponent(id!)}`

  const songId = Number(id)
  if (!Number.isInteger(songId) || songId <= 0)
    return null
  if ((route.name === 'MusicInfo' || route.name === 'PlaylistMusicInfo') && Number(route.params.musicId) === songId)
    return route.path
  const playlistSong = player.playlist.find(song => song.songId === songId)
  if (playlistSong)
    return `/album/${playlistSong.albumId}/music/${songId}`
  const cachedAlbum = queryClient.getQueriesData<AlbumInfo>({ queryKey: ['albumInfo'] })
    .map(([, album]) => album)
    .find(album => album?.songs.some(song => song.id === songId))
  return cachedAlbum ? `/album/${cachedAlbum.id}/music/${songId}` : null
}

async function openNotification(notification: Notification) {
  const metadata = getCommentMetadata(notification)
  if (!metadata) {
    if (isCommentNotification(notification))
      toast.error(t('NotificationPanel.this_notification_has_no_comment_location'))
    await markRead(notification.id)
    return
  }
  if (navigatingId.value !== null)
    return
  navigatingId.value = notification.id
  try {
    const [location, path] = await Promise.all([
      getCommentLocationApi(metadata.commentId, metadata.postId),
      Promise.resolve(resolveCommentPath(metadata.postId)),
    ])
    if (!path) {
      toast.error(t('NotificationPanel.unable_to_find_the_page_for_this_comment'))
      return
    }
    await markRead(notification.id)
    emit('navigate')
    await router.push({
      path,
      query: {
        commentPostId: metadata.postId,
        commentId: location.commentId,
        commentThreadId: location.threadId,
        commentThreadPage: String(location.threadPage),
        ...(location.replyPage == null ? {} : { commentReplyPage: String(location.replyPage) }),
      },
    })
  }
  catch (error) {
    toast.error(error instanceof CommentApiError && error.code === 404
      ? t('NotificationPanel.comment_does_not_exist_or_is_not_visible')
      : error instanceof Error ? error.message : t('CommentThread.unable_to_locate_the_comment_please_try_again_later'))
  }
  finally {
    navigatingId.value = null
  }
}

function notificationTypeLabel(notification: Notification) {
  if (notification.type === 'comment-reply')
    return t('NotificationPanel.comment_reply')
  if (notification.type === 'comment-approval')
    return t('NotificationPanel.comment_review')
  return null
}

onMounted(() => fetchNotifications(true))
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
      <span class="text-xs text-gray-400">
        {{ unreadCount > 0 ? t('NotificationPanel.unread_notification', { p0: unreadCount }, Number(unreadCount)) : t('NotificationPanel.no_unread_notifications') }}
      </span>
      <div class="flex gap-0.5">
        <AppButton
          variant="ghost"
          size="xs"
          :class="unreadCount > 0 ? 'hover:bg-gray-100 hover:dark:bg-gray-800 text-gray-500 dark:text-gray-400' : 'opacity-40 cursor-not-allowed text-gray-400'"
          :disabled="unreadCount === 0"
          @click="markAllRead"
        >
          {{ t('NotificationPanel.mark_all_as_read') }}
        </AppButton>
        <AppButton
          variant="ghost"
          size="xs"
          class="text-red-500 hover:text-red-500 hover:bg-red-50 hover:dark:bg-red-500/15"
          @click="deleteRead"
        >
          {{ t('NotificationPanel.delete_read') }}
        </AppButton>
      </div>
    </div>

    <div class="overflow-y-auto max-h-72 overscroll-contain">
      <AsyncFade>
        <div v-if="loading && notifications.length === 0" role="status" class="py-10 text-center text-sm text-gray-400">
          {{ t('App.loading') }}
        </div>
        <div v-else-if="loadError && notifications.length === 0" class="py-10 text-center text-sm text-gray-400" role="alert">
          {{ t('NotificationPanel.failed_to_load_notifications_alternate') }}<AppButton size="sm" variant="ghost" @click="fetchNotifications(true)">
            {{ t('App.retry') }}
          </AppButton>
        </div>
        <div v-else-if="notifications.length === 0" class="py-10 text-center text-sm text-gray-400">
          {{ t('NotificationPanel.no_notifications') }}
        </div>
        <div v-else>
          <div
            v-for="n in notifications"
            :key="n.id"
            class="group flex items-start gap-2.5 px-3 py-3 hover:bg-gray-50 hover:dark:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
            :class="{ 'cursor-pointer': !n.isRead || isCommentNotification(n), 'opacity-60': navigatingId === n.id }"
            :role="isCommentNotification(n) ? 'button' : undefined"
            :tabindex="isCommentNotification(n) ? 0 : undefined"
            @click="openNotification(n)"
            @keydown.enter.self="openNotification(n)"
          >
            <div class="mt-1.5 size-1.5 rounded-full shrink-0 transition-colors" :class="n.isRead ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-500'" />
            <div class="flex-1 min-w-0">
              <p class="text-sm leading-snug" :class="n.isRead ? 'text-gray-500 dark:text-gray-400' : 'font-medium text-gray-900 dark:text-gray-100'">
                {{ n.title }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                {{ n.content }}
              </p>
              <p class="text-[11px] text-gray-300 mt-1 flex items-center gap-1.5">
                <span v-if="notificationTypeLabel(n)" class="rounded bg-blue-50 dark:bg-blue-500/15 px-1.5 py-0.5 text-blue-500">{{ notificationTypeLabel(n) }}</span>
                <span>{{ formatRelativeTime(n.createdAt) }}</span>
              </p>
            </div>
            <AppButton
              icon-only
              size="xs"
              variant="ghost"
              class="opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
              :aria-label="t('NotificationPanel.delete_notification')"
              @click.stop="removeNotification(n.id)"
            >
              <LucideX class="size-3 text-gray-400" />
            </AppButton>
          </div>
          <button
            v-if="hasMore"
            class="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:dark:text-gray-400 hover:bg-gray-50 hover:dark:bg-gray-800 transition-colors cursor-pointer"
            :disabled="loading"
            @click.stop="loadMore"
          >
            {{ loading ? t('App.loading') : t('NotificationPanel.load_more') }}
          </button>
        </div>
      </AsyncFade>
    </div>
  </div>
</template>

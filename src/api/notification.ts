import type { NotificationListResponse } from '@/types/notification'
import { userApiBase } from '@/constants'
import { fetchJson, fetchJsonMutation } from '@/utils/fetch'

export function getNotificationUnreadCountApi() {
  return fetchJson<{ count: number }>(`${userApiBase}/api/notifications/unread-count?platform=2`, true, 'user-service')
}

export function getNotificationsApi(page = 1, limit = 20) {
  return fetchJson<NotificationListResponse>(`${userApiBase}/api/notifications?platform=2&page=${page}&limit=${limit}`, true, 'user-service')
}

export function markAllNotificationsReadApi() {
  return fetchJsonMutation<{ updated: number }>(`${userApiBase}/api/notifications/read-all?platform=2`, 'PUT', undefined, 'user-service')
}

export function markNotificationReadApi(id: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${userApiBase}/api/notifications/${id}/read?platform=2`, 'PUT', undefined, 'user-service')
}

export function deleteNotificationApi(id: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${userApiBase}/api/notifications/${id}?platform=2`, 'DELETE', undefined, 'user-service')
}

export function deleteReadNotificationsApi() {
  return fetchJsonMutation<{ deleted: number }>(`${userApiBase}/api/notifications/read?platform=2`, 'DELETE', undefined, 'user-service')
}

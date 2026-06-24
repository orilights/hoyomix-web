export interface Notification {
  id: number
  title: string
  content: string
  isRead: boolean
  readAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface NotificationListResponse {
  total: number
  unreadCount: number
  page: number
  limit: number
  items: Notification[]
}

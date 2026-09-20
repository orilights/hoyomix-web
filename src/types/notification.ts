export interface Notification {
  id: number
  type: string
  title: string
  content: string
  isRead: boolean
  readAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  platforms: (1 | 2)[]
}

export interface CommentNotificationMetadata {
  postId: string
  commentId: string
  threadId: string
  replyTo: string | null
}

export interface NotificationListResponse {
  total: number
  unreadCount: number
  page: number
  limit: number
  items: Notification[]
}

export type CommentState = 'normal' | 'pending' | 'rejected' | 'deleted'
export type VoteType = 1 | -1

export interface CommentUser {
  id: string
  name: string
  image: string | null
}

export interface Comment {
  id: string
  postId: string
  content: string
  state: CommentState
  parent: string | null
  replyTo: string | null
  upvoteCount: number
  userId: string
  createdAt: string
  updatedAt: string
  user: CommentUser
  userVote?: VoteType | null
  replyToUser?: CommentUser | null
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface CommentThreadsData {
  data: CommentThread[]
  commentCount: number
  pagination: Pagination
}

export interface CommentThread {
  threadId: string
  root: Comment
  replyCount: number
  replies: Comment[]
}

export interface CommentListData {
  data: Comment[]
  pagination: Pagination
}

export interface CommentLocation {
  commentId: string
  threadId: string
  threadPage: number
  replyPage: number | null
}

export interface CommentApiResponse<T> {
  code: number
  error: boolean
  message: string
  data: T | null
}

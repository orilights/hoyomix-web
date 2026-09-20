import type { Comment, CommentApiResponse, CommentListData, CommentLocation, CommentThreadsData, VoteType } from '@/types/comment'
import { userApiBase } from '@/constants'

export const COMMENT_THREAD_PAGE_SIZE = 20
export const COMMENT_REPLY_PAGE_SIZE = 10

export class CommentApiError extends Error {
  public readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'CommentApiError'
  }
}

async function commentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body != null && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  const res = await fetch(`${userApiBase}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  })
  const body = await res.json() as CommentApiResponse<T>
  if (body.error || body.data === null)
    throw new CommentApiError(body.code, body.message)
  return body.data
}

export function getCommentThreadsApi(postId: string, page = 1, pageSize = COMMENT_THREAD_PAGE_SIZE) {
  const query = new URLSearchParams({ postId, page: String(page), pageSize: String(pageSize) })
  return commentRequest<CommentThreadsData>(`/api/comments/threads?${query}`)
}

export function getCommentRepliesApi(threadId: string, postId: string, page = 1, pageSize = COMMENT_REPLY_PAGE_SIZE) {
  const query = new URLSearchParams({ postId, page: String(page), pageSize: String(pageSize) })
  return commentRequest<CommentListData>(`/api/comments/${encodeURIComponent(threadId)}/replies?${query}`)
}

export function getCommentLocationApi(commentId: string, postId: string) {
  const query = new URLSearchParams({
    postId,
    threadPageSize: String(COMMENT_THREAD_PAGE_SIZE),
    replyPageSize: String(COMMENT_REPLY_PAGE_SIZE),
  })
  return commentRequest<CommentLocation>(`/api/comments/${encodeURIComponent(commentId)}/location?${query}`)
}

export function getCommentApi(id: string) {
  return commentRequest<Comment>(`/api/comments/${encodeURIComponent(id)}`)
}

export function createCommentApi(input: { postId: string, content: string, replyTo?: string }) {
  return commentRequest<{ id: string }>('/api/comments', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateCommentApi(id: string, content: string) {
  return commentRequest<{ id: string }>(`/api/comments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export function deleteCommentApi(id: string) {
  return commentRequest<{ id: string }>(`/api/comments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function voteCommentApi(id: string, type: VoteType) {
  return commentRequest<{ id: string }>(`/api/comments/${encodeURIComponent(id)}/vote`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
}

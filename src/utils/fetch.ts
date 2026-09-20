export class NotFoundError extends Error {
  constructor(message = '资源不存在') {
    super(message)
    this.name = 'NotFoundError'
  }
}

type ResponseFormat = 'raw' | 'user-service'

async function parseUserServiceResponse<T>(res: Response): Promise<T> {
  const body = await res.json() as { code: number, error: boolean, message: string, data: T | null }
  if (res.status === 404 || body.code === 404)
    throw new NotFoundError(body.message)
  if (!res.ok || body.error !== false || body.code !== 200 || body.data == null)
    throw new Error(body.message || '用户服务请求失败')
  return body.data
}

export async function fetchJson<T>(url: string, credentials = true, format: ResponseFormat = 'raw'): Promise<T> {
  const res = await fetch(url, { credentials: credentials ? 'include' : undefined })
  if (format === 'user-service')
    return parseUserServiceResponse<T>(res)
  if (!res.ok) {
    if (res.status === 404)
      throw new NotFoundError()
    throw new Error((await res.json()).error || '未知错误')
  }
  return res.json() as Promise<T>
}

export async function fetchJsonMutation<T>(url: string, method: string, body?: unknown, format: ResponseFormat = 'raw'): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (format === 'user-service')
    return parseUserServiceResponse<T>(res)
  if (!res.ok)
    throw new Error((await res.json()).error || '未知错误')
  if (res.status === 204 || res.headers.get('content-length') === '0')
    return undefined as T
  return res.json() as Promise<T>
}

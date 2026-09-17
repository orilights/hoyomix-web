export class NotFoundError extends Error {
  constructor(message = '资源不存在') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function fetchJson<T>(url: string, credentials = true): Promise<T> {
  const res = await fetch(url, { credentials: credentials ? 'include' : undefined })
  if (!res.ok) {
    if (res.status === 404)
      throw new NotFoundError()
    throw new Error((await res.json()).error || '未知错误')
  }
  return res.json() as Promise<T>
}

export async function fetchJsonMutation<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok)
    throw new Error((await res.json()).error || '未知错误')
  if (res.status === 204 || res.headers.get('content-length') === '0')
    return undefined as T
  return res.json() as Promise<T>
}

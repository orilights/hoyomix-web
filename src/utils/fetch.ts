import { t } from '@/i18n'
import { LocalizedError } from '@/i18n/error'

export class NotFoundError extends Error {
  constructor(message?: string) {
    super(message)
    if (message === undefined)
      Object.defineProperty(this, 'message', { configurable: true, get: () => t('fetch.resource_not_found') })
    this.name = 'NotFoundError'
  }
}

type ResponseFormat = 'raw' | 'user-service'

async function parseUserServiceResponse<T>(res: Response): Promise<T> {
  const body = await res.json() as { code: number, error: boolean, message: string, data: T | null }
  if (res.status === 404 || body.code === 404)
    throw new NotFoundError(body.message)
  if (!res.ok || body.error !== false || body.code !== 200 || body.data == null)
    throw body.message ? new Error(body.message) : new LocalizedError('fetch.user_service_request_failed')
  return body.data
}

export async function fetchJson<T>(url: string, credentials = true, format: ResponseFormat = 'raw'): Promise<T> {
  const res = await fetch(url, { credentials: credentials ? 'include' : undefined })
  if (format === 'user-service')
    return parseUserServiceResponse<T>(res)
  if (!res.ok) {
    if (res.status === 404)
      throw new NotFoundError()
    const message = (await res.json()).error
    throw message ? new Error(message) : new LocalizedError('App.unknown_error')
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
  if (!res.ok) {
    const message = (await res.json()).error
    throw message ? new Error(message) : new LocalizedError('App.unknown_error')
  }
  if (res.status === 204 || res.headers.get('content-length') === '0')
    return undefined as T
  return res.json() as Promise<T>
}

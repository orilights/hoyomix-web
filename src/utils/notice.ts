import type { Notice } from '../types/notice'
import { i18n } from '@/i18n'
import { LocalizedError } from '@/i18n/error'

function readText(metadata: Record<string, unknown>, key: string, fallback = '') {
  const value = metadata[key]
  if (value === undefined || value === null)
    return fallback
  if (typeof value !== 'string')
    throw new LocalizedError('notice.announcement_must_be_text', { p0: key })
  return value.trim() || fallback
}

function readDate(metadata: Record<string, unknown>, key: string) {
  const value = readText(metadata, key)
  if (!value)
    return null
  const date = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
    || !Number.isFinite(Date.parse(value))
    || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new LocalizedError('notice.invalid_date_in_announcement', { p0: key })
  }
  return value
}

export async function parseNotices(source: string): Promise<Notice[]> {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
  if (!normalized)
    return []

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  }
  catch {
    throw new LocalizedError('notice.announcements_must_be_valid_json')
  }
  if (!Array.isArray(parsed))
    throw new LocalizedError('notice.announcements_must_be_a_json_array')
  const notices = await Promise.all(parsed.map(parseNoticeItem))
  return notices.filter((notice): notice is Notice => notice !== null)
}

async function parseNoticeItem(value: unknown): Promise<Notice | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new LocalizedError('notice.each_announcement_must_be_a_json_object')
  const metadata = value as Record<string, unknown>
  if (metadata.important !== undefined && typeof metadata.important !== 'boolean')
    throw new LocalizedError('notice.announcement_important_must_be_a_boolean')
  const notice = {
    // This fallback participates in the existing read-state hash; keep it stable.
    title: readText(metadata, 'title', '公告'),
    summary: readText(metadata, 'summary'),
    publishedAt: readDate(metadata, 'publishedAt'),
    updatedAt: readDate(metadata, 'updatedAt'),
    important: metadata.important === true,
    content: readText(metadata, 'content').replace(/\r\n?/g, '\n'),
  }
  if (!notice.content)
    return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(notice)))
  return {
    key: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
    ...notice,
    defaultTitle: !readText(metadata, 'title'),
  }
}

export function formatNoticeDate(value: string) {
  return new Intl.DateTimeFormat(i18n.global.locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(/^\d{4}-\d{2}-\d{2}$/.test(value) ? { timeZone: 'UTC' } : {}),
  }).format(new Date(value))
}

import { LocalizedError } from '@/i18n/error'
import { fetchJson } from '@/utils/fetch'
import { parseNotices } from '@/utils/notice'

// 不适合归入音乐、用户或媒体等业务模块的杂项接口。
export function getChangelog() {
  return fetchJson<Record<string, string>>('https://api.amarea.cn/config/hoyomix.changelog', false)
}

export async function getNotice() {
  const data = await fetchJson<Record<string, unknown>>('https://api.amarea.cn/config/hoyomix.notice', false)
  const source = data['hoyomix.notice']
  if (source == null)
    return []
  if (typeof source !== 'string')
    throw new LocalizedError('misc.invalid_announcement_format')
  return parseNotices(source)
}

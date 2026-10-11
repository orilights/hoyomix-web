import { fetchJson } from '@/utils/fetch'

// 不适合归入音乐、用户或媒体等业务模块的杂项接口。
export function getChangelog() {
  return fetchJson<Record<string, string>>('https://api.amarea.cn/config/hoyomix.changelog', false)
}

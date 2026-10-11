export function formatDuration(duration: number | string) {
  if (typeof duration === 'string') {
    duration = Number.parseInt(duration, 10)
  }
  const hours = Math.floor(duration / 60 / 60)
  const minutes = Math.floor(duration / 60) % 60
  const seconds = Math.floor(duration % 60)
  if (hours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getPublishDate(publishTime: number | string) {
  if (typeof publishTime === 'string') {
    publishTime = new Date(publishTime).getTime()
  }
  const date = new Date(publishTime)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr)
  if (!Number.isFinite(date.getTime()))
    return '-'
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(value => String(value).padStart(2, '0'))
    .join(':')
  return `${getPublishDate(date.getTime())} ${time}`
}

export function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)
    return '刚刚'
  if (minutes < 60)
    return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30)
    return `${days}天前`
  const months = Math.floor(days / 30)
  if (months < 12)
    return `${months}个月前`
  return `${Math.floor(months / 12)}年前`
}

export function formatCommentTime(isoStr: string, now = Date.now()): string {
  const date = new Date(isoStr)
  const diff = now - date.getTime()
  if (!Number.isFinite(diff))
    return '-'
  if (diff < 60000)
    return '刚刚'
  if (diff < 3600000)
    return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000)
    return `${Math.floor(diff / 3600000)}小时前`

  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getFullYear() === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && date.getDate() === yesterday.getDate()) {
    return `昨天 ${time}`
  }
  return `${getPublishDate(date.getTime())} ${time}`
}

/** 贡献记录仅显示天、月、年；缺失或无效时间兼容旧版接口。 */
export function formatContributionTime(isoStr: string, now = Date.now()): string {
  const diff = now - new Date(isoStr).getTime()
  if (!Number.isFinite(diff) || diff < 86400000)
    return '最近'
  const days = Math.floor(diff / 86400000)
  if (days < 30)
    return `${days}天前`
  const months = Math.floor(days / 30)
  if (months < 12)
    return `${months}个月前`
  return `${Math.floor(months / 12)}年前`
}

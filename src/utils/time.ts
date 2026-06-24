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

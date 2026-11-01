import type { Locale } from '@/i18n/locale'
import { i18n, t } from '@/i18n'
import { localDate, relativeUnit } from '@/i18n/formatters'

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

export function getPublishDate(publishTime: number | string, locale: Locale = i18n.global.locale.value) {
  return localDate(publishTime, locale)
}

export function formatDateTime(isoStr: string | number, locale: Locale = i18n.global.locale.value): string {
  return localDate(isoStr, locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  if (!Number.isFinite(diff))
    return '-'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)
    return t('time.just_now')
  if (minutes < 60)
    return relativeUnit(minutes, 'minute', i18n.global.locale.value)
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return relativeUnit(hours, 'hour', i18n.global.locale.value)
  const days = Math.floor(hours / 24)
  if (days < 30)
    return relativeUnit(days, 'day', i18n.global.locale.value)
  const months = Math.floor(days / 30)
  if (months < 12)
    return relativeUnit(months, 'month', i18n.global.locale.value)
  return relativeUnit(Math.floor(months / 12), 'year', i18n.global.locale.value)
}

export function formatCommentTime(isoStr: string, now = Date.now()): string {
  const date = new Date(isoStr)
  const diff = now - date.getTime()
  if (!Number.isFinite(diff))
    return '-'
  if (diff < 60000)
    return t('time.just_now')
  if (diff < 3600000)
    return relativeUnit(Math.floor(diff / 60000), 'minute', i18n.global.locale.value)
  if (diff < 86400000)
    return relativeUnit(Math.floor(diff / 3600000), 'hour', i18n.global.locale.value)

  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getFullYear() === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && date.getDate() === yesterday.getDate()) {
    return t('time.yesterday', { p0: time })
  }
  return `${getPublishDate(date.getTime())} ${time}`
}

/** 贡献记录仅显示天、月、年；缺失或无效时间兼容旧版接口。 */
export function formatContributionTime(isoStr: string, now = Date.now()): string {
  const diff = now - new Date(isoStr).getTime()
  if (!Number.isFinite(diff) || diff < 86400000)
    return t('time.recently')
  const days = Math.floor(diff / 86400000)
  if (days < 30)
    return relativeUnit(days, 'day', i18n.global.locale.value)
  const months = Math.floor(days / 30)
  if (months < 12)
    return relativeUnit(months, 'month', i18n.global.locale.value)
  return relativeUnit(Math.floor(months / 12), 'year', i18n.global.locale.value)
}

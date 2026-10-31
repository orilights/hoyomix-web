import type { Locale } from './locale'

export function localDate(value: string | number | Date, locale: Locale, options: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()))
    return '-'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? { timeZone: 'UTC' } : {}),
    ...options,
  }).format(date)
}

export function relativeUnit(value: number, unit: Intl.RelativeTimeFormatUnit, locale: Locale): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'always' }).format(-value, unit)
}

export function localNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value)
}

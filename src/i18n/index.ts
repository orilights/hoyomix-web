import type { Locale } from './locale'
import { createI18n } from 'vue-i18n'
import { localNumber } from './formatters'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'

const messages: Record<Locale, typeof zhCN> = { 'zh-CN': zhCN, 'zh-TW': zhTW, en }

export const i18n = createI18n({
  legacy: false,
  flatJson: true,
  // Only trusted chart messages contain markup; UI messages remain text nodes.
  warnHtmlMessage: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages,
})

/** For event handlers and presentation helpers outside component setup. */
export type MessageKey = keyof typeof zhCN

export function t(key: MessageKey, params: Record<string, unknown> = {}, plural?: number): string {
  const named = Object.fromEntries(Object.entries(params).map(([name, value]) => [
    name,
    typeof value === 'number' ? formatNumber(value) : value,
  ]))
  return plural === undefined ? i18n.global.t(key, named) : i18n.global.t(key, named, plural)
}

export function formatNumber(value: number | undefined): string {
  if (value === undefined)
    return ''
  return localNumber(value, i18n.global.locale.value)
}

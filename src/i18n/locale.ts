export type Locale = 'zh-CN' | 'zh-TW' | 'en'
export type LanguagePreference = 'auto' | Locale

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'auto' || value === 'zh-CN' || value === 'zh-TW' || value === 'en'
}

export function resolveLocale(language?: string): Locale {
  if (!language)
    return 'zh-CN'
  try {
    const locale = new Intl.Locale(language)
    if (locale.language !== 'zh')
      return 'en'
    if (locale.script)
      return locale.script === 'Hant' ? 'zh-TW' : 'zh-CN'
    return ['TW', 'HK', 'MO'].includes(locale.region ?? '') ? 'zh-TW' : 'zh-CN'
  }
  catch {
    return 'zh-CN'
  }
}

export function browserLocale(): Locale {
  return resolveLocale(navigator.languages?.[0] || navigator.language)
}

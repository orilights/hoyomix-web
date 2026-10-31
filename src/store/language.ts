import type { LanguagePreference } from '@/i18n/locale'
import { defineStore } from 'pinia'
import { i18n } from '@/i18n'
import { browserLocale, isLanguagePreference } from '@/i18n/locale'

// Restricted storage environments must still allow switching for this session.
export const languageStorage = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key)
    }
    catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    }
    catch {
      // Keep the in-memory preference.
    }
  },
}

export const useLanguageStore = defineStore('language', () => {
  const preference = ref<LanguagePreference>('auto')
  const detectedLocale = ref(browserLocale())
  const locale = computed(() => preference.value === 'auto' ? detectedLocale.value : preference.value)

  function setPreference(value: unknown) {
    detectedLocale.value = browserLocale()
    preference.value = isLanguagePreference(value) ? value : 'auto'
  }

  function initialize() {
    setPreference(preference.value)
    watch(locale, (value) => {
      i18n.global.locale.value = value
      document.documentElement.lang = value
      document.querySelector('meta[property="og:locale"]')?.setAttribute('content', value === 'en' ? 'en_US' : value.replace('-', '_'))
    }, { immediate: true, flush: 'sync' })
    window.addEventListener('languagechange', () => {
      if (preference.value === 'auto')
        detectedLocale.value = browserLocale()
    })
  }

  return { preference, locale, setPreference, initialize }
}, {
  persist: { pick: ['preference'], storage: languageStorage },
})

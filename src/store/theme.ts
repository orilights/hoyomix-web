import { usePreferredDark } from '@vueuse/core'
import { defineStore } from 'pinia'

export type ThemeMode = 'system' | 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')
  const systemDark = usePreferredDark()
  const isDark = computed(() => mode.value === 'dark' || (mode.value === 'system' && systemDark.value))

  function setMode(value: ThemeMode) {
    mode.value = value
  }

  function initialize() {
    if (!['system', 'light', 'dark'].includes(mode.value))
      mode.value = 'system'
    watch(isDark, (dark) => {
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111827' : '#f5f7fa')
    }, { immediate: true })
  }

  return { mode, isDark, setMode, initialize }
}, {
  persist: { pick: ['mode'] },
})

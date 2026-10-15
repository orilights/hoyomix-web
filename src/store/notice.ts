import type { Notice } from '@/types/notice'

export const useNoticeStore = defineStore('notice', () => {
  const notices = shallowRef<Notice[]>([])
  const currentIndex = ref(0)
  const current = computed(() => notices.value[currentIndex.value] ?? null)
  const visible = ref(false)
  const seenKeys = ref<string[]>([])

  function markAllRead(items: Notice[]) {
    if (!Array.isArray(seenKeys.value))
      seenKeys.value = []
    seenKeys.value = [...new Set([...seenKeys.value, ...items.map(notice => notice.key)])]
  }

  function open(items: Notice[], index = 0) {
    if (!items.length)
      return
    notices.value = items
    currentIndex.value = Math.max(0, Math.min(index, items.length - 1))
    visible.value = true
    markAllRead(items)
  }

  function showImportant(items: Notice[]) {
    if (visible.value) {
      const key = current.value?.key
      notices.value = items
      currentIndex.value = Math.max(0, items.findIndex(notice => notice.key === key))
      markAllRead(items)
      if (!items.length)
        visible.value = false
      return
    }
    const index = items.findIndex(notice => notice.important && (!Array.isArray(seenKeys.value) || !seenKeys.value.includes(notice.key)))
    if (index >= 0)
      open(items, index)
  }

  function select(index: number) {
    if (index >= 0 && index < notices.value.length)
      currentIndex.value = index
  }

  return { notices, currentIndex, current, visible, seenKeys, open, select, showImportant }
}, {
  persist: { pick: ['seenKeys'] },
})

import type { Notice } from '@/types/notice'

export const useNoticeStore = defineStore('notice', () => {
  const notices = shallowRef<Notice[]>([])
  const currentIndex = ref(0)
  const current = computed(() => notices.value[currentIndex.value] ?? null)
  const visible = ref(false)
  const readKeys = ref<string[]>([])
  const promptedKeys = ref<string[]>([])

  function isRead(notice: Notice) {
    return Array.isArray(readKeys.value) && readKeys.value.includes(notice.key)
  }

  function markCurrentRead() {
    if (!Array.isArray(readKeys.value))
      readKeys.value = []
    if (current.value && !isRead(current.value))
      readKeys.value = [...readKeys.value, current.value.key]
  }

  function markImportantPrompted(items: Notice[]) {
    if (!Array.isArray(promptedKeys.value))
      promptedKeys.value = []
    promptedKeys.value = [...new Set([...promptedKeys.value, ...items.filter(notice => notice.important).map(notice => notice.key)])]
  }

  function open(items: Notice[], index?: number) {
    if (!items.length)
      return
    notices.value = items
    const selected = index ?? items.findIndex(notice => !isRead(notice))
    currentIndex.value = Math.max(0, Math.min(selected, items.length - 1))
    visible.value = true
    markImportantPrompted(items)
    markCurrentRead()
  }

  function showImportant(items: Notice[]) {
    if (visible.value) {
      const key = current.value?.key
      notices.value = items
      currentIndex.value = Math.max(0, items.findIndex(notice => notice.key === key))
      markImportantPrompted(items)
      markCurrentRead()
      if (!items.length)
        visible.value = false
      return
    }
    notices.value = items
    const index = items.findIndex(notice => notice.important && (!Array.isArray(promptedKeys.value) || !promptedKeys.value.includes(notice.key)))
    if (index >= 0)
      open(items, index)
  }

  function select(index: number) {
    if (index >= 0 && index < notices.value.length) {
      currentIndex.value = index
      markCurrentRead()
    }
  }

  return { notices, currentIndex, current, visible, readKeys, promptedKeys, isRead, open, select, showImportant }
}, {
  persist: { pick: ['readKeys', 'promptedKeys'] },
})

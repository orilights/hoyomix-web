import { createSharedComposable, useLocalStorage } from '@vueuse/core'
import { normalizeRecentEmoticons, rememberRecentEmoticon } from '@/utils/recent-emoticons'

export const useRecentEmoticons = createSharedComposable(() => {
  const stored = useLocalStorage<unknown>('hoyomix:recent-emoticons', [], { onError: () => {} })
  const recentIds = computed(() => normalizeRecentEmoticons(stored.value))
  function record(id: string) {
    stored.value = rememberRecentEmoticon(stored.value, id)
  }
  return { recentIds, record }
})

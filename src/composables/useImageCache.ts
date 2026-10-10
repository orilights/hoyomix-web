import { imageCacheSupported, requestImageCache } from '@/utils/image-cache'

export function useImageCache() {
  const bytes = ref<number | null>(null)
  const count = ref(0)
  const busy = ref(false)
  const error = ref('')
  async function update(action: 'stats' | 'clear' = 'stats') {
    if (busy.value || !imageCacheSupported)
      return false
    busy.value = true
    try {
      const stats = await requestImageCache(action)
      bytes.value = stats.bytes
      count.value = stats.count
      error.value = ''
      return true
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '无法读取图片缓存'
      return false
    }
    finally {
      busy.value = false
    }
  }
  onMounted(() => {
    void update()
  })
  return { supported: imageCacheSupported, bytes, count, busy, error, update }
}

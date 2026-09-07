import { createSharedComposable } from '@vueuse/core'
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'
import { fallbackCoverColors, getImageColors } from '@/utils/cover'

// 全屏背景、频谱及设置预览共享一个监听器和一次图片解码/取色。
export const usePlayerCoverColors = createSharedComposable(() => {
  const player = usePlayerStore()
  const colors = shallowRef(fallbackCoverColors)
  const coverUrl = computed(() => player.currentSong
    ? getCoverUrl(player.currentSong.albumPlatforms, '128px')
    : '')

  watch(coverUrl, async (url, _, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    if (!url) {
      colors.value = fallbackCoverColors
      return
    }
    try {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = url
      await image.decode()
      if (cancelled)
        return
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 128
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        colors.value = fallbackCoverColors
        return
      }
      ctx.drawImage(image, 0, 0, 128, 128)
      colors.value = getImageColors(ctx.getImageData(0, 0, 128, 128))
    }
    catch {
      if (!cancelled)
        colors.value = fallbackCoverColors
    }
  }, { immediate: true })

  return {
    gradient: computed(() => colors.value.gradient),
    accent: computed(() => colors.value.accent),
  }
})

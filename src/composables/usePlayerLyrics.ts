import type { MaybeRefOrGetter } from 'vue'
import type { LyricLine } from '@/utils'
import { computed, toValue } from 'vue'
import { mergeLyrics } from '@/utils'

interface UsePlayerLyricsOptions {
  lyricData: MaybeRefOrGetter<string>
  lyricTranslation: MaybeRefOrGetter<string>
  currentTime: MaybeRefOrGetter<number>
  lyricsOffset: MaybeRefOrGetter<number>
}

/**
 * Shared lyric parsing and current-line calculation for the full and compact
 * player layouts. The timing rules intentionally match the existing lyric UI.
 */
export function usePlayerLyrics(options: UsePlayerLyricsOptions) {
  const parsedLyrics = computed<LyricLine[]>(() =>
    mergeLyrics(toValue(options.lyricData), toValue(options.lyricTranslation)),
  )

  const hasTimestamp = computed(() =>
    parsedLyrics.value.some(line => line.time !== null),
  )

  const currentLineIndex = computed(() => {
    const defaultOffset = 0.4
    const currentTime = toValue(options.currentTime)
    const lyricsOffset = toValue(options.lyricsOffset)

    if (parsedLyrics.value.length === 0 || !hasTimestamp.value)
      return -1

    // mergeLyrics 按时间升序排列，查找最后一个不晚于当前播放时间的行。
    const time = currentTime + defaultOffset + lyricsOffset
    if (Number.isNaN(time))
      return -1
    let left = 0
    let right = parsedLyrics.value.length
    while (left < right) {
      const middle = Math.floor((left + right) / 2)
      if (parsedLyrics.value[middle].time! <= time)
        left = middle + 1
      else
        right = middle
    }
    return left - 1
  })

  return {
    parsedLyrics,
    hasTimestamp,
    currentLineIndex,
  }
}

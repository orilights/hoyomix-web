import type { MaybeRefOrGetter } from 'vue'
import type { LyricLine } from '@/utils'
import { computed, toValue } from 'vue'
import { useWordLyricsQuery } from '@/composables/queries'
import { i18n } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { mergeLyrics } from '@/utils'
import { selectWordTranslation, wordLyricActiveRange } from '@/utils/word-lyrics'

interface UsePlayerLyricsOptions {
  lyricData: MaybeRefOrGetter<string>
  lyricTranslation: MaybeRefOrGetter<string>
  currentTime: MaybeRefOrGetter<number>
  lyricsOffset: MaybeRefOrGetter<number>
}

/** 全屏和紧凑布局共用歌词源；仅 LRC 保留原有的提前量。 */
export function usePlayerLyrics(options: UsePlayerLyricsOptions) {
  const player = usePlayerStore()
  const songId = computed(() => player.useWordLyrics ? player.currentSong?.songId ?? null : null)
  const query = useWordLyricsQuery(songId)
  const wordLyrics = computed(() => {
    const response = query.data.value
    return response?.songId === songId.value ? response.lyrics : null
  })
  const parsedLyrics = computed<LyricLine[]>(() => wordLyrics.value
    ? wordLyrics.value.lines.map(line => ({
        time: line.start / 1000,
        text: line.text,
        translation: selectWordTranslation(line.translations, i18n.global.locale.value),
        wordLine: line,
      }))
    : mergeLyrics(toValue(options.lyricData), toValue(options.lyricTranslation)))
  const wordLyricAuthors = computed(() => {
    const authors = wordLyrics.value?.source?.authors
    return Array.isArray(authors) ? [...new Set(authors.filter((author): author is string => typeof author === 'string' && author.trim().length > 0))] : []
  })
  const hasTranslation = computed(() => parsedLyrics.value.some(line => line.translation))

  const hasTimestamp = computed(() =>
    parsedLyrics.value.some(line => line.time !== null),
  )
  const wordRanges = computed(() => wordLyrics.value?.lines.map(line => ({
    ...wordLyricActiveRange(line),
    backgroundOf: line.backgroundOf,
  })) ?? [])

  const currentLineIndex = computed(() => {
    const defaultOffset = wordLyrics.value ? 0 : 0.4
    const currentTime = toValue(options.currentTime)
    const lyricsOffset = toValue(options.lyricsOffset)

    if (parsedLyrics.value.length === 0 || !hasTimestamp.value)
      return -1

    // mergeLyrics 按时间升序排列，查找最后一个不晚于当前播放时间的行。
    const time = currentTime + defaultOffset + lyricsOffset
    if (Number.isNaN(time))
      return -1
    if (wordLyrics.value) {
      let previous = -1
      let active = -1
      for (let i = 0; i < wordRanges.value.length; i++) {
        const line = wordRanges.value[i]
        if (line.backgroundOf || line.start > time * 1000)
          continue
        previous = i
        if (line.end > time * 1000)
          active = i
      }
      return active >= 0 ? active : previous
    }
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
    hasTranslation,
    wordLyricAuthors,
  }
}

import type { ExportPlatforms } from '@/types/export'

export function selectLyricProvider(platforms: ExportPlatforms): 'ncm' | 'qq' | null {
  if (platforms.ncm)
    return 'ncm'
  if (platforms.qq)
    return 'qq'
  return null
}

export interface LyricLine {
  time: number | null
  text: string
  translation?: string
}

const lrcLineRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

function parseLrc(lrc: string): Map<number, string> {
  const map = new Map<number, string>()
  for (const line of lrc.split('\n')) {
    const matches = [...line.matchAll(lrcLineRegex)]
    if (matches.length === 0)
      continue
    const text = line.replace(lrcLineRegex, '').trim()
    if (!text)
      continue
    for (const match of matches) {
      const minutes = Number.parseInt(match[1], 10)
      const seconds = Number.parseInt(match[2], 10)
      const ms = Number.parseInt(match[3].padEnd(3, '0'), 10)
      // 精确到 10ms，用于模糊匹配
      const time = Math.round((minutes * 60 + seconds + ms / 1000) * 100) / 100
      map.set(time, text)
    }
  }
  return map
}

function findTranslation(transMap: Map<number, string>, time: number): string | undefined {
  if (transMap.has(time))
    return transMap.get(time)
  for (const [tTime, tText] of transMap) {
    if (Math.abs(tTime - time) <= 0.01)
      return tText
  }
  return undefined
}

export function mergeLyrics(content: string, translation: string): LyricLine[] {
  if (!content)
    return []

  const originMap = parseLrc(content)

  // 无时间戳，解析为纯文本行
  if (originMap.size === 0) {
    return content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(text => ({ time: null, text }))
  }

  const transMap = translation ? parseLrc(translation) : new Map<number, string>()

  const lines: LyricLine[] = []
  for (const [time, text] of originMap) {
    let trans = transMap.size > 0 ? findTranslation(transMap, time) : undefined
    if (trans === '//' || trans === '/')
      trans = undefined
    lines.push({ time, text, translation: trans })
  }

  return lines.sort((a, b) => a.time! - b.time!)
}

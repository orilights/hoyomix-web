import type { LyricWord, WordLyricLine, WordLyrics } from '../types/word-lyrics'

export function wordLyricSides(lines: readonly Pick<WordLyricLine, 'id' | 'agent' | 'backgroundOf'>[]): ('left' | 'right')[] {
  const mainLines = lines.filter(line => !line.backgroundOf)
  const agents = [...new Set(mainLines.map(line => line.agent).filter(Boolean))]
  const parents = new Map(mainLines.map(line => [line.id, line]))
  return lines.map((line) => {
    const agent = (line.backgroundOf ? parents.get(line.backgroundOf) : line)?.agent
    return agents.length > 1 && agent && agent !== agents[0] ? 'right' : 'left'
  })
}

export function wordLyricActiveRange(line: Pick<WordLyricLine, 'start' | 'end' | 'words'>): { start: number, end: number } {
  let start = Number.POSITIVE_INFINITY
  let end = Number.NEGATIVE_INFINITY
  for (const word of line.words) {
    if (word.end <= word.start || !word.text.trim())
      continue
    start = Math.min(start, word.start)
    end = Math.max(end, word.end)
  }
  return Number.isFinite(start) ? { start, end } : { start: line.start, end: line.end }
}

export function wordLyricScrollIndex(lines: readonly { start: number, end: number, backgroundOf: string | null }[], time: number): number {
  if (!Number.isFinite(time))
    return -1
  const now = time * 1000
  const target = now + 400
  let index = -1
  let nearest = -1
  let distance = Number.POSITIVE_INFINITY
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.backgroundOf)
      continue
    if (line.start <= target && target < line.end)
      index = i
    const delta = Math.max(line.start - now, now - line.end, 0)
    if (delta <= distance) {
      distance = delta
      nearest = i
    }
  }
  return index >= 0 ? index : nearest
}

export function isWordLyrics(value: unknown): value is WordLyrics {
  if (!value || typeof value !== 'object')
    return false
  const data = value as WordLyrics
  if (data.version !== 1 || !Array.isArray(data.lines) || data.lines.length > 2000 || !data.lines.length)
    return false
  const validTime = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 86400000
  let words = 0
  const ids = new Set<string>()
  const mainIds = new Set<string>()
  for (const line of data.lines) {
    if (!line || typeof line.id !== 'string' || ids.has(line.id) || typeof line.text !== 'string'
      || (line.lang !== undefined && line.lang !== null && typeof line.lang !== 'string')
      || !validTime(line.start) || !validTime(line.end) || line.end < line.start
      || (line.backgroundOf !== null && typeof line.backgroundOf !== 'string')
      || (line.agent !== null && typeof line.agent !== 'string')
      || !Array.isArray(line.words) || !Array.isArray(line.translations)) {
      return false
    }
    ids.add(line.id)
    if (line.backgroundOf === null)
      mainIds.add(line.id)
    words += line.words.length
    if (words > 30000 || !line.words.every(w => w && typeof w.text === 'string' && validTime(w.start) && validTime(w.end) && w.start >= line.start && w.end <= line.end && w.end >= w.start)
      || !line.translations.every(t => t && typeof t.lang === 'string' && typeof t.text === 'string')
      || (line.words.length > 0 && line.words.map(w => w.text).join('') !== line.text)) {
      return false
    }
  }
  return data.lines.every(l => !l.backgroundOf || mainIds.has(l.backgroundOf))
    && data.lines.some(l => l.words.some(w => w.end > w.start))
}

export function selectWordTranslation(translations: { lang: string, text: string }[], locale: string, sourceLanguage?: string | null): string | undefined {
  const language = (tag: string) => tag.trim().toLowerCase().replace(/_/g, '-').split('-')[0]
  if (sourceLanguage && language(sourceLanguage) === language(locale))
    return undefined
  translations = translations.filter(t => t.text.trim())
  const normalized = locale.toLowerCase()
  return (translations.find(t => t.lang.toLowerCase() === normalized)
    ?? translations.find(t => /^zh-(?:hans|cn|sg)(?:-|$)/i.test(t.lang.replace(/_/g, '-')))
    ?? translations.find(t => t.lang.toLowerCase().split('-')[0] === normalized.split('-')[0])
    ?? translations.find(t => t.lang.toLowerCase().startsWith('zh')))?.text
}

export function wordProgress(word: LyricWord, time: number, discrete: boolean): number {
  if (time < word.start)
    return 0
  if (discrete || word.end <= word.start || time >= word.end)
    return 1
  return (time - word.start) / (word.end - word.start)
}

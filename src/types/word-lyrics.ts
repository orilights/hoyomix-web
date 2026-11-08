export interface LyricWord {
  text: string
  start: number
  end: number
}

export interface WordLyricLine {
  id: string
  lang?: string | null
  start: number
  end: number
  text: string
  words: LyricWord[]
  translations: { lang: string, text: string }[]
  romanizations: { lang: string, text: string }[]
  agent: string | null
  backgroundOf: string | null
}

export interface WordLyrics {
  version: 1
  lines: WordLyricLine[]
  source: {
    provider: 'amll'
    platform: string
    platformId: string
    path: string
    authors: string[]
    updatedAt: string
  }
}

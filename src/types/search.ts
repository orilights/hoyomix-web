import type { SongTag } from './song-tag'

export type SearchType = 'song' | 'album' | 'product' | 'artist' | 'series'

export interface SearchResultItem {
  type: SearchType
  id: number | string
  name: string
  matches: Record<string, string>
  songTags?: SongTag[]
  albumId?: number
  albumName?: string
  productName?: string
  publishDate?: string
}

export interface SearchResponse {
  processingTimeMs: number
  results: SearchResultItem[]
}

export interface SearchPageResponse extends SearchResponse {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type SearchType = 'song' | 'album' | 'product' | 'artist' | 'series'

export interface SearchResultItem {
  type: SearchType
  id: number | string
  name: string
  matches: Record<string, string>
  albumId?: number
  albumName?: string
  productName?: string
  publishDate?: string
}

export interface SearchResponse {
  processingTimeMs: number
  results: SearchResultItem[]
}

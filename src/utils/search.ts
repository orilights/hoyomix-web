import type { LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import type { SearchResultItem, SearchType } from '@/types/search'

export const searchTypeOptions: { label: string, value: SearchType | undefined }[] = [
  { label: '全部', value: undefined },
  { label: '歌曲', value: 'song' },
  { label: '专辑', value: 'album' },
  { label: '专辑系列', value: 'series' },
  { label: '游戏', value: 'product' },
  { label: '艺术家', value: 'artist' },
]

export function parseSearchType(value: unknown): SearchType | undefined {
  return searchTypeOptions.find(option => option.value === value)?.value
}

export function searchQuery(keyword: string, type?: SearchType, page = 1): LocationQueryRaw {
  return {
    q: keyword.trim() || undefined,
    type,
    page: keyword.trim() && page > 1 ? String(page) : undefined,
  }
}

export function searchResultRoute(item: SearchResultItem): RouteLocationRaw {
  switch (item.type) {
    case 'song': return { name: 'MusicInfo', params: { albumId: item.albumId, musicId: item.id } }
    case 'album': return { name: 'AlbumInfo', params: { id: item.id } }
    case 'product': return { name: 'ProductInfo', params: { name: item.name } }
    case 'artist': return { name: 'ArtistInfo', params: { name: item.name } }
    case 'series': return { name: 'AlbumSeries', params: { seriesName: item.name } }
  }
}

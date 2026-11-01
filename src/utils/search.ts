import type { LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import type { SearchResultItem, SearchType } from '@/types/search'
import { t } from '@/i18n'

export const searchTypeOptions: { label: string, value: SearchType | undefined }[] = [
  { get label() {
    return t('search.all')
  }, value: undefined },
  { get label() {
    return t('SongList.song')
  }, value: 'song' },
  { get label() {
    return t('SongList.album')
  }, value: 'album' },
  { get label() {
    return t('search.album_series')
  }, value: 'series' },
  { get label() {
    return t('search.game')
  }, value: 'product' },
  { get label() {
    return t('search.artist')
  }, value: 'artist' },
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

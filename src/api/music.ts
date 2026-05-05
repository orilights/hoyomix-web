import type { AlbumInfo, AlbumListItemInfo, ArtistInfo, ArtistTypeInfo, ProductListItemInfo, SongInfo, SongLyricInfo, SongMediaInfo } from '@/types/core'
import type { SearchResponse } from '@/types/search'
import { apiBase } from '@/constants'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export function getChangelog() {
  return fetchJson<Record<string, string>>('https://api.amarea.cn/config/hoyomix.changelog')
}

export function getAlbumListApi() {
  return fetchJson<AlbumListItemInfo[]>(`${apiBase}/albums`)
}

export function getProductListApi() {
  return fetchJson<ProductListItemInfo[]>(`${apiBase}/products`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetchJson<AlbumInfo>(`${apiBase}/albums/${albumId}`)
}

export function getSongInfoApi(songId: number) {
  return fetchJson<SongInfo>(`${apiBase}/songs/${songId}`)
}

export function getCreditInfoApi(id: number | string, type: 'album' | 'song' | 'product') {
  const paths: Record<string, string> = { album: 'albums', song: 'songs', product: 'products' }
  return fetchJson<ArtistTypeInfo>(`${apiBase}/credits/${paths[type]}/${id}`)
}

export function getArtistInfoApi(artistName: string) {
  return fetchJson<ArtistInfo>(`${apiBase}/artists/${artistName}`)
}

export function getLyricsApi(provider: 'qq' | 'ncm', songId: number | string) {
  return fetchJson<SongLyricInfo>(`${apiBase}/lyrics?provider=${provider}&songId=${songId}`)
}

export function getSongMediaApi(songId: number | string) {
  return fetchJson<SongMediaInfo>(`${apiBase}/media/${songId}`)
}

export function getSearchApi(q: string, type?: string, limit?: number) {
  const params = new URLSearchParams({ q })
  if (type)
    params.set('type', type)
  if (limit)
    params.set('limit', String(limit))
  return fetchJson<SearchResponse>(`${apiBase}/search?${params}`)
}

export function getAlbumsByTagApi(tagType: string, tagName: string) {
  return fetchJson<AlbumListItemInfo[]>(`${apiBase}/tags/${tagType}/${encodeURIComponent(tagName)}/albums`)
}

export function getSessionInfoApi() {
  return fetchJson<{ user: { id: number, name: string } }>(`${apiBase}/get-session`)
}

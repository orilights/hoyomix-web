import type { ArtistInfo, ExportAlbum, ExportAlbumListItem, SongLyricData } from '@/types/export'
import type { SearchResponse } from '@/types/search'
import { apiBase } from '@/constants'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export function getChangelog() {
  return fetchJson<Record<string, string>>('https://api.amarea.cn/config/hoyomix.changelog')
}

export function getAlbumListApi() {
  return fetchJson<ExportAlbumListItem[]>(`${apiBase}/albums`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetchJson<ExportAlbum>(`${apiBase}/albums/${albumId}`)
}

export interface ArtistTypeInfo {
  [typeName: string]: {
    name: string
    alias: string[]
    songs?: { id: number, name: string }[]
  }[]
}

export function getCreditInfoApi(id: number | string, type: 'album' | 'song' | 'product') {
  const paths: Record<string, string> = { album: 'albums', song: 'songs', product: 'products' }
  return fetchJson<ArtistTypeInfo>(`${apiBase}/credits/${paths[type]}/${id}`)
}

export function getArtistInfoApi(artistName: string) {
  return fetchJson<ArtistInfo>(`${apiBase}/artists/${artistName}`)
}

export function getLyricsApi(provider: 'qq' | 'ncm', songId: number | string) {
  return fetchJson<SongLyricData>(`${apiBase}/lyrics?provider=${provider}&songId=${songId}`)
}

export interface SongMediaResponse {
  medias: string[]
}

export function getSongMediaApi(songId: number | string) {
  return fetchJson<SongMediaResponse>(`${apiBase}/media/${songId}`)
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
  return fetchJson<ExportAlbumListItem[]>(`${apiBase}/tags/${tagType}/${encodeURIComponent(tagName)}/albums`)
}

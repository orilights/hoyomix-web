import type { AlbumInfo, AlbumListItemInfo, AppConfigResponse, ArtistInfo, ArtistTypeInfo, EditRequestResponse, MapTreeNode, PlaylistDetail, PlaylistListItem, PlaylistListResponse, PlaylistReview, PlaylistSongItem, SongInfo, SongInfoChange, SongLyricInfo, SongMapsChange, SongMediaResponse, SongTagsChange } from '@/types/core'
import type { NotificationListResponse } from '@/types/notification'
import type { SearchResponse } from '@/types/search'
import { apiBase } from '@/constants'

export class NotFoundError extends Error {
  constructor(message = '资源不存在') {
    super(message)
    this.name = 'NotFoundError'
  }
}

async function fetchJson<T>(url: string, credentials = true): Promise<T> {
  const res = await fetch(url, { credentials: credentials ? 'include' : undefined })
  if (!res.ok) {
    if (res.status === 404)
      throw new NotFoundError()
    throw new Error((await res.json()).error || '未知错误')
  }
  return res.json() as Promise<T>
}

export async function fetchJsonMutation<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok)
    throw new Error((await res.json()).error || '未知错误')
  if (res.status === 204 || res.headers.get('content-length') === '0')
    return undefined as T
  return res.json() as Promise<T>
}

export function getChangelog() {
  return fetchJson<Record<string, string>>('https://api.amarea.cn/config/hoyomix.changelog', false)
}

export function getAlbumListApi() {
  return fetchJson<AlbumListItemInfo[]>(`${apiBase}/albums`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetchJson<AlbumInfo>(`${apiBase}/albums/${albumId}`)
}

export function getSongInfoApi(songId: number) {
  return fetchJson<SongInfo>(`${apiBase}/songs/${songId}`)
}

export function getMapTreeApi(game: string) {
  return fetchJson<MapTreeNode[]>(`${apiBase}/maps?game=${encodeURIComponent(game)}`)
}

export function submitSongRegionEditApi(songId: number, maps: SongMapsChange) {
  return fetchJsonMutation<EditRequestResponse>(`${apiBase}/edit-requests`, 'POST', {
    resourceType: 'song',
    resourceId: songId,
    changes: { maps },
  })
}

export function submitSongTagsEditApi(songId: number, tags: SongTagsChange) {
  return fetchJsonMutation<EditRequestResponse>(`${apiBase}/edit-requests`, 'POST', {
    resourceType: 'song',
    resourceId: songId,
    changes: { tags },
  })
}

export function submitSongInfoEditApi(songId: number, changes: SongInfoChange) {
  return fetchJsonMutation<EditRequestResponse>(`${apiBase}/edit-requests`, 'POST', {
    resourceType: 'song',
    resourceId: songId,
    changes,
  })
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
  return fetchJson<SongMediaResponse>(`${apiBase}/song/${songId}/media`)
}

export function fetchAppConfig() {
  return fetchJson<AppConfigResponse>(`${apiBase}/app-config`, false)
}

const trailingSlashRegex = /\/+$/

export async function pingMediaSource(baseUrl: string, signal?: AbortSignal): Promise<number | null> {
  const url = `${baseUrl.replace(trailingSlashRegex, '')}/test`
  const start = performance.now()
  try {
    await fetch(url, {
      method: 'HEAD',
      credentials: 'omit',
      signal: signal ?? AbortSignal.timeout(5000),
    })
    return performance.now() - start
  }
  catch {
    return null
  }
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

export interface PlaylistCreateData {
  name: string
  description?: string
  coverAlbumId?: number | null
  isPublic?: boolean
}

export interface PlaylistsQueryParams {
  page?: number
  limit?: number
  name?: string
  userId?: string
  sort?: 'asc' | 'desc'
}

export function getPublicPlaylistsApi(params?: PlaylistsQueryParams) {
  const query = new URLSearchParams()
  if (params?.page)
    query.set('page', String(params.page))
  if (params?.limit)
    query.set('limit', String(params.limit))
  if (params?.name)
    query.set('name', params.name)
  if (params?.userId)
    query.set('userId', params.userId)
  if (params?.sort)
    query.set('sort', params.sort)
  const qs = query.toString()
  return fetchJson<PlaylistListResponse>(`${apiBase}/playlists/public${qs ? `?${qs}` : ''}`)
}

export function getMyPlaylistsApi() {
  return fetchJson<PlaylistListItem[]>(`${apiBase}/playlists/me`)
}

export function getPlaylistDetailApi(id: string) {
  return fetchJson<PlaylistDetail>(`${apiBase}/playlists/${id}`)
}

export function createPlaylistApi(data: PlaylistCreateData) {
  return fetchJsonMutation<PlaylistListItem>(`${apiBase}/playlists`, 'POST', data)
}

export function updatePlaylistApi(id: string, data: Partial<PlaylistCreateData>) {
  return fetchJsonMutation<PlaylistListItem>(`${apiBase}/playlists/${id}`, 'PUT', data)
}

export function deletePlaylistApi(id: string) {
  return fetchJsonMutation<void>(`${apiBase}/playlists/${id}`, 'DELETE')
}

export function updatePlaylistSongsApi(id: string, songIds: number[]) {
  return fetchJsonMutation<{ count: number }>(`${apiBase}/playlists/${id}/songs`, 'PUT', { songIds })
}

export function getPlaylistReviewApi(id: string) {
  return fetchJson<PlaylistReview>(`${apiBase}/playlists/${id}/review`)
}

export function cancelPlaylistReviewApi(id: string) {
  return fetchJsonMutation<void>(`${apiBase}/playlists/${id}/review`, 'DELETE')
}

export interface RandomPlaylistParams {
  limit?: number
  products?: string[]
  albums?: number[]
  excludeAlbums?: number[]
  excludeInstrumental?: boolean
  dateFrom?: string
  dateTo?: string
}

export function getRandomPlaylistApi(params?: RandomPlaylistParams) {
  const query = new URLSearchParams()
  if (params?.limit)
    query.set('limit', String(params.limit))
  if (params?.products?.length)
    query.set('products', params.products.join(','))
  if (params?.albums?.length)
    query.set('albums', params.albums.join(','))
  if (params?.excludeAlbums?.length)
    query.set('excludeAlbums', params.excludeAlbums.join(','))
  if (params?.excludeInstrumental)
    query.set('excludeInstrumental', 'true')
  if (params?.dateFrom)
    query.set('dateFrom', params.dateFrom)
  if (params?.dateTo)
    query.set('dateTo', params.dateTo)
  const qs = query.toString()
  return fetchJson<PlaylistSongItem[]>(`${apiBase}/random-playlist${qs ? `?${qs}` : ''}`)
}

export function getNotificationUnreadCountApi() {
  return fetchJson<{ count: number }>(`${apiBase}/notifications/unread-count`)
}

export function getNotificationsApi(page = 1, limit = 20) {
  return fetchJson<NotificationListResponse>(`${apiBase}/notifications?page=${page}&limit=${limit}`)
}

export function markAllNotificationsReadApi() {
  return fetchJsonMutation<{ updated: number }>(`${apiBase}/notifications/read-all`, 'PUT')
}

export function markNotificationReadApi(id: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/notifications/${id}/read`, 'PUT')
}

export function deleteNotificationApi(id: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/notifications/${id}`, 'DELETE')
}

export function deleteReadNotificationsApi() {
  return fetchJsonMutation<{ deleted: number }>(`${apiBase}/notifications/read`, 'DELETE')
}

export function getAllFavoritesApi() {
  return fetchJson<{ songIds: number[] }>(`${apiBase}/favorites`)
}

export function addFavoriteApi(songId: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/favorites/${songId}`, 'POST')
}

export function removeFavoriteApi(songId: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/favorites/${songId}`, 'DELETE')
}

export function getFavoritePlaylistsApi() {
  return fetchJson<{ items: PlaylistListItem[] }>(`${apiBase}/playlists/favorites`)
}

export function getPlaylistFavoriteStatusApi(id: string) {
  return fetchJson<{ isFavorited: boolean }>(`${apiBase}/playlists/${id}/favorite`)
}

export function addPlaylistFavoriteApi(id: string) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/playlists/${id}/favorite`, 'POST')
}

export function removePlaylistFavoriteApi(id: string) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/playlists/${id}/favorite`, 'DELETE')
}

export type RankingPeriod = '1d' | '7d' | '30d' | '365d' | 'all'

export interface RankingResponse {
  date?: string
  songs: PlaylistSongItem[]
}

export function getRankingApi(period: RankingPeriod, date?: string) {
  const params = new URLSearchParams({ period })
  if (date)
    params.set('date', date)
  return fetchJson<RankingResponse>(`${apiBase}/ranking?${params}`)
}

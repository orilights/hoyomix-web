import type { AlbumInfo, AlbumListItemInfo, AppConfigResponse, ArtistInfo, ArtistTypeInfo, ContributionInfo, ContributionRankingPeriod, ContributionRankingResponse, EditRequestResponse, MapSongsResponse, MapTreeNode, PlaylistDetail, PlaylistListItem, PlaylistListResponse, PlaylistReview, PlaylistSongItem, SongInfo, SongInfoChange, SongLyricInfo, SongMapsChange, SongMediaResponse, SongTagsChange } from '@/types/core'
import type { EditRequestDetail, EditRequestList, EditRequestParams } from '@/types/edit-request'

import type { SearchResponse } from '@/types/search'

import { apiBase } from '@/constants'
import { fetchJson, fetchJsonMutation } from '@/utils/fetch'

export function getAlbumListApi() {
  return fetchJson<AlbumListItemInfo[]>(`${apiBase}/albums`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetchJson<AlbumInfo>(`${apiBase}/albums/${albumId}`)
}

export function getSongInfoApi(songId: number) {
  return fetchJson<SongInfo>(`${apiBase}/songs/${songId}`)
}

export function getMyEditRequestsApi(params: EditRequestParams) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined)
      query.set(key, String(value))
  }
  return fetchJson<EditRequestList>(`${apiBase}/edit-requests/me?${query}`)
}

export function getEditRequestApi(id: number) {
  return fetchJson<EditRequestDetail>(`${apiBase}/edit-requests/${id}`)
}

export function cancelEditRequestApi(id: number) {
  return fetchJsonMutation<void>(`${apiBase}/edit-requests/${id}`, 'DELETE')
}

export function getMapTreeApi(game: string, withSongCounts = false) {
  const query = new URLSearchParams({ game })
  if (withSongCounts)
    query.set('withSongCounts', 'true')
  return fetchJson<MapTreeNode[]>(`${apiBase}/maps?${query}`)
}

export interface MapSongsParams {
  game: string
  includeChildren: boolean
  page: number
}

export function getMapSongsApi(id: number, params: MapSongsParams) {
  const query = new URLSearchParams({ game: params.game, includeChildren: String(params.includeChildren), page: String(params.page), limit: '50' })
  return fetchJson<MapSongsResponse>(`${apiBase}/maps/${id}/songs?${query}`)
}

export function getMapPlaybackApi(id: number, game: string, includeChildren: boolean) {
  const query = new URLSearchParams({ game, includeChildren: String(includeChildren) })
  return fetchJson<{ songs: PlaylistSongItem[] }>(`${apiBase}/maps/${id}/songs/playback?${query}`)
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
  return fetchJson<ArtistInfo>(`${apiBase}/artists/${encodeURIComponent(artistName)}`)
}

export function getArtistNameByAliasApi(alias: string) {
  return fetchJson<{ name: string }>(`${apiBase}/artists/resolve-alias?${new URLSearchParams({ alias })}`)
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
  minDuration?: number
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
  if (params?.minDuration !== undefined)
    query.set('minDuration', String(params.minDuration))
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

export function getAllFavoritesApi() {
  return fetchJson<{ songIds: number[] }>(`${apiBase}/favorites`)
}

export function getAlbumFavoritesApi() {
  return fetchJson<{ albumIds: number[] }>(`${apiBase}/album-favorites`)
}

export function addAlbumFavoriteApi(albumId: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/albums/${albumId}/favorite`, 'POST')
}

export function removeAlbumFavoriteApi(albumId: number) {
  return fetchJsonMutation<{ ok: boolean }>(`${apiBase}/albums/${albumId}/favorite`, 'DELETE')
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

export function getContributionsApi(id: number, type: 'album' | 'song') {
  return fetchJson<ContributionInfo>(`${apiBase}/${type === 'album' ? 'albums' : 'songs'}/${id}/contributions`)
}

export function getContributionRankingApi(period: ContributionRankingPeriod) {
  return fetchJson<ContributionRankingResponse>(`${apiBase}/contributions/ranking?${new URLSearchParams({ period })}`)
}

import type { EditRequestResponse, SongLyricLanguages } from '@/types/core'

import type { SongTag, SongTagPatch, SongTagSongsParams, SongTagSongsResponse } from '@/types/song-tag'
import { apiBase } from '@/constants'
import { fetchJson, fetchJsonMutation } from '@/utils/fetch'

export function getSongLyricLanguagesApi(songId: number) {
  return fetchJson<SongLyricLanguages>(`${apiBase}/songs/${songId}/lyric-languages`)
}

export function getSongTagsApi() {
  return fetchJson<SongTag[]>(`${apiBase}/song-tags`)
}
export function getSongTagApi(code: string) {
  return fetchJson<SongTag>(`${apiBase}/song-tags/${encodeURIComponent(code)}`)
}
export function getSongTagSongsApi(code: string, params: SongTagSongsParams) {
  const query = new URLSearchParams({ page: String(params.page), sort: params.sort })
  if (params.productId)
    query.set('productId', String(params.productId))
  return fetchJson<SongTagSongsResponse>(`${apiBase}/song-tags/${encodeURIComponent(code)}/songs?${query}`)
}
export async function getAllSongTagSongsApi(code: string, params: Omit<SongTagSongsParams, 'page'>) {
  const first = await getSongTagSongsApi(code, { ...params, page: 1 })
  const songs = [...first.items]
  const pages = Math.ceil(first.total / first.limit)
  for (let page = 2; page <= pages; page++) {
    const result = await getSongTagSongsApi(code, { ...params, page })
    songs.push(...result.items)
  }
  return songs
}
export function submitSongTagEditApi(songId: number, songTags: SongTagPatch) {
  return fetchJsonMutation<EditRequestResponse>(`${apiBase}/edit-requests`, 'POST', { resourceType: 'song', resourceId: songId, changes: { songTags } })
}

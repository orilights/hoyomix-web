import { apiBase } from '@/constants'

export function getAlbumListApi() {
  return fetch(`${apiBase}/albumList.json`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetch(`${apiBase}/album/${albumId}.json`)
}

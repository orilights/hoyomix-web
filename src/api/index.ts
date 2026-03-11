import { apiBase } from '@/constants'

export function getAlbumListApi() {
  return fetch(`${apiBase}/albumList.json`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetch(`${apiBase}/album/${albumId}.json`)
}

export function getAlbumArtistInfoApi(albumId: number) {
  return fetch(`${apiBase}/artist/album/${albumId}.json`)
}

export function getMusicArtistInfoApi(musicId: number) {
  return fetch(`${apiBase}/artist/song/${musicId}.json`)
}

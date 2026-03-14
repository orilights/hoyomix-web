import { apiBase } from '@/constants'

export function getChangelog() {
  return fetch('https://api.amarea.cn/config/hoyomix.changelog')
}

export function getAlbumListApi() {
  return fetch(`${apiBase}/albumList.json`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetch(`${apiBase}/album/${albumId}.json`)
}

export function getArtistInfoApi(id: number | string, type: 'album' | 'song' | 'product') {
  return fetch(`${apiBase}/artist/${type}/${id}.json`)
}

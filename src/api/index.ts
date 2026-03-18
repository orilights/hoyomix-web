import { apiBase } from '@/constants'

export function getChangelog() {
  return fetch('https://api.amarea.cn/config/hoyomix.changelog')
}

export function getAlbumListApi() {
  return fetch(`${apiBase}/albums`)
}

export function getAlbumInfoApi(albumId: number) {
  return fetch(`${apiBase}/albums/${albumId}`)
}

export function getCreditInfoApi(id: number | string, type: 'album' | 'song' | 'product') {
  let requestUrl: string = ''
  if (type === 'album') {
    requestUrl = `${apiBase}/credits/albums/${id}`
  }
  else if (type === 'song') {
    requestUrl = `${apiBase}/credits/songs/${id}`
  }
  else if (type === 'product') {
    requestUrl = `${apiBase}/credits/products/${id}`
  }
  return fetch(requestUrl)
}

export function getArtistInfoApi(artistName: string) {
  return fetch(`${apiBase}/artists/${artistName}`)
}

export function getLyricsApi(provider: 'qq' | 'ncm', songId: number | string) {
  return fetch(`${apiBase}/lyrics?provider=${provider}&songId=${songId}`)
}

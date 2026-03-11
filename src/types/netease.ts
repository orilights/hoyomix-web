export interface NeteaseClientSchemeParams {
  type: 'album' | 'artist' | 'song'
  id: number | string
  cmd: 'play'
}

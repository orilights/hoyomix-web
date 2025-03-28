export interface NeteaseClientSchemeParams {
  type: 'album' | 'artist' | 'song'
  id: number
  cmd: 'play'
}

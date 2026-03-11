export enum MusicType {
  NORMAL = 1,
  PURE_MUSIC = 2,
}

export interface ArtistData {
  name: string
  type: string
  o: boolean
}

export interface MusicData {
  name: string
  duration: number
  artists: ArtistData[]
  type: MusicType
  netease: {
    id: number
    alias?: string
  }
}

export interface AlbumData {
  name: string
  publishTime: number
  product: string
  size: number
  musics: MusicData[]
  netease: {
    id: number
    coverPicId: number
    alias?: string
    description?: string
  }
}

export interface AlbumListData {
  id: number
  name: string
  publishTime: number
  size: number
  netease: {
    id: number
    coverPicId: number
  }
}

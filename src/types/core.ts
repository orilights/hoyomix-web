export interface AlbumInfo {
  id: number
  name: string
  description: string
  productName: string
  publishDate: string
  platforms: PlatformInfoMap
  tags: TagInfo[]
  songs: SongListItemInfo[]
  totalDuration: string
}

export interface SongInfo {
  id: number
  tags: TagInfo[]
}

export interface ArtistInfo {
  name: string
  alias: string[]
  isHoyomix: boolean
  songs: {
    id: number
    name: string
    albumId: number
    albumName: string
    albumIndex: number
    productName: string
    roles: string[]
  }[]
  albums: {
    id: number
    name: string
    productName: string
  }[]
  products: string[]
}

export interface TagInfo {
  tagType: string
  tagName: string
  tagData?: any
}

export type AlbumListItemInfo = Omit<AlbumInfo, 'songs' | 'tags'> & {
  songCount: number
}

export interface SongListItemInfo {
  id: number
  name: string
  description: string
  disc: string
  track: number
  duration: string
  platforms: PlatformInfoMap
}

export interface SongLyricInfo {
  songId: number
  provider: 'ncm' | 'qq'
  content: string
  translation: string | null
}

export interface ArtistTypeInfo {
  [typeName: string]: {
    name: string
    alias: string[]
    songs?: { id: number, name: string }[]
  }[]
}

export interface PlatformInfo {
  id: string
  name: string
}

export interface PlatformInfoMap {
  qq?: PlatformInfo
  ncm?: PlatformInfo
}

export interface SongMediaInfo {
  medias: string[]
}

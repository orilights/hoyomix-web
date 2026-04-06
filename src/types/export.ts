export interface ExportPlatformRef {
  id: string
  name: string
}

export interface ExportPlatforms {
  qq?: ExportPlatformRef
  ncm?: ExportPlatformRef
}

export interface ExportSong {
  id: number
  name: string
  description: string
  disc: string
  track: number
  duration: string
  platforms: ExportPlatforms
}

export interface ExportAlbum {
  id: number
  name: string
  description: string
  productName: string
  publishDate: string
  platforms: ExportPlatforms
  tags: TagInfo[]
  songs: ExportSong[]
  totalDuration: string
}

export type ExportAlbumListItem = Omit<ExportAlbum, 'songs' | 'tags'> & {
  songCount: number
}

export interface ArtistInfo {
  name: string
  alias: string[]
  isHoyomix: boolean
  songs: ExportSong[]
  albums: ExportAlbumListItem[]
  products: string[]
}

export interface VideoTagData {
  source: 'web'
  link: string
  url: string
  cover: string
  duration: number
}

export interface TagInfo {
  tagType: string
  tagName: string
  tagData?: VideoTagData
}

export interface SongLyricData {
  songId: number
  provider: 'ncm' | 'qq'
  content: string
  translation: string | null
}

export interface SongInfo {
  id: number
  tags: TagInfo[]
}

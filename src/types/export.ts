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
  songs: ExportSong[]
}

export type ExportAlbumListItem = Omit<ExportAlbum, 'songs'> & {
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

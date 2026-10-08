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

export interface SongMapInfo {
  id: number
  path: string[]
  note?: string
}

export interface SongInfo {
  id: number
  tags: TagInfo[]
  maps?: SongMapInfo[]
}

/** 地图树节点（GET /maps 返回的嵌套结构） */
export interface MapTreeNode {
  id: number
  name: string
  children: MapTreeNode[]
}

/** 歌曲地图（地区）关联的增量变更 */
export interface SongMapsChange {
  update?: { mapId: number, note: string | null }[]
  add?: { mapId: number, note?: string | null }[]
  remove?: { mapId: number }[]
}

/** 歌曲标签（如视频）的增量变更 */
export interface SongTagsChange {
  add?: { tagType: string, tagName: string, tagData?: string }[]
  remove?: { tagType: string, tagName: string }[]
}

/** 歌曲基础信息（名称/描述）的变更 */
export interface SongInfoChange {
  name?: string
  description?: string
}

/** 提交编辑申请响应（普通用户待审核 ｜ 管理员直接生效） */
export type EditRequestResponse
  = | { directApproved: true, requestId: number, contributionId: number }
    | { directApproved?: undefined, id: number, status: string }

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

export interface ProductListItemInfo {
  productId: number
  name: string
  alias: string
  tags: TagInfo[]
}

export type AlbumListItemInfo = Omit<AlbumInfo, 'songs'> & {
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
    isHoyomix: boolean
    songCount: number
    songs: { id: number, name: string }[]
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

export interface MediaSourceConfig {
  name: string
  region: string
  baseUrl: string
  priority: number
  supportedQualities: number[]
}

export interface AppConfigResponse {
  sources: MediaSourceConfig[]
  products: ProductListItemInfo[]
}

export interface SongMediaItemResponse {
  sourceName: string
  region: string
  quality: number
  url: string
}

export interface SongMediaResponse {
  medias: SongMediaItemResponse[]
}

export type PlaylistReviewStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface PlaylistReview {
  id: number
  playlistId: string
  type: 'make_public' | 'update_info'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  snapshotBefore: { name: string, description: string, isPublic: boolean }
  snapshotAfter: { name: string, description: string, isPublic: boolean }
  reason: string
  createdAt: string
  updatedAt: string
}

export interface PlaylistListItem {
  id: string
  name: string
  description: string | null
  coverAlbumId: number | null
  isPublic: boolean
  type?: string
  reviewStatus: PlaylistReviewStatus
  userId: string
  createdAt: string
  updatedAt: string
  songCount: number
}

export interface PlaylistSongItem {
  songId: number
  songName: string
  songDescription: string
  duration: string
  albumId: number
  albumName: string
  platforms: PlatformInfoMap
  albumPlatforms: PlatformInfoMap
}

export interface PlaylistDetail extends Omit<PlaylistListItem, 'songCount'> {
  songCount: number
  songs: PlaylistSongItem[]
}

export interface PlaylistListResponse {
  total: number
  page: number
  limit: number
  items: PlaylistListItem[]
}

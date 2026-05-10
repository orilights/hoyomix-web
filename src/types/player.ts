import type { PlatformInfoMap } from './core'

export interface PlaylistItem {
  songId: number
  songName: string
  songDescription: string
  duration: string
  albumId: number
  albumName: string
  platforms: PlatformInfoMap
  albumPlatforms: PlatformInfoMap
}

export type PlayMode = 'sequential' | 'loop' | 'single' | 'shuffle'
export type AudioQuality = 9 | 5 | 1
export type LyricsSource = 'ncm' | 'qq'

export interface SongMediaItem {
  quality: string
  url: string
}

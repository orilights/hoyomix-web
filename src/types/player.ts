import type { ExportPlatforms } from './export'

export interface PlaylistItem {
  songId: number
  songName: string
  songDescription: string
  duration: string
  albumId: number
  albumName: string
  platforms: ExportPlatforms
  albumPlatforms: ExportPlatforms
}

export type PlayMode = 'sequential' | 'loop' | 'single' | 'shuffle'
export type AudioQuality = 'sq' | 'hq'

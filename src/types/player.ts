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
export type AudioQuality = 9 | 5 | 1

export interface SongMediaItem {
  quality: string
  url: string
}

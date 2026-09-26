import type { PlaylistSongItem } from './core'

export interface SongListGroup {
  key: string | number
  label: string
  songs: PlaylistSongItem[]
}

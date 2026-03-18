import type { ExportAlbum, ExportSong } from '@/types/export'
import type { AudioQuality, PlaylistItem } from '@/types/player'
import { resourceBase, resourceBaseBackup } from '@/constants'

export function getSongUrl(songId: number, quality: AudioQuality): string {
  if (quality === 'sq') {
    return `${resourceBase}/song/raw/${songId}.flac`
  }
  return `${resourceBase}/song/320/${songId}.mp3`
}

export function getSongBackupUrl(songId: number, quality: AudioQuality): string | undefined {
  if (!resourceBaseBackup)
    return undefined
  if (quality === 'sq') {
    return `${resourceBaseBackup}/song/raw/${songId}.flac`
  }
  return `${resourceBaseBackup}/song/320/${songId}.mp3`
}

export function buildPlaylistItem(song: ExportSong, album: ExportAlbum): PlaylistItem {
  return {
    songId: song.id,
    songName: song.name,
    songDescription: song.description,
    duration: song.duration,
    albumId: album.id,
    albumName: album.name,
    platforms: song.platforms,
    albumPlatforms: album.platforms,
  }
}

export function buildPlaylistFromAlbum(album: ExportAlbum): PlaylistItem[] {
  return album.songs.map(song => buildPlaylistItem(song, album))
}

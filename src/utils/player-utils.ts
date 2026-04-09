import type { AlbumInfo, SongListItemInfo } from '@/types/core'
import type { AudioQuality, PlaylistItem, SongMediaItem } from '@/types/player'
import { audioQualityOptions, getQualityKey } from '@/constants'
import { getCoverUrl } from './misc'

// 解析服务端返回的 medias 数组（格式："quality|url"）
export function parseSongMedia(medias: string[]): SongMediaItem[] {
  return medias.map((item) => {
    const separatorIndex = item.indexOf('|')
    return {
      quality: item.slice(0, separatorIndex),
      url: item.slice(separatorIndex + 1),
    }
  })
}

// 根据目标音质选择 URL 列表，优先降级、其次升级
export function selectMediaUrls(items: SongMediaItem[], quality: AudioQuality): string[] {
  const targetKey = getQualityKey(quality)
  const matched = items.filter(i => i.quality === targetKey).map(i => i.url)
  if (matched.length > 0)
    return matched

  // 按值排序的所有音质选项
  const sorted = [...audioQualityOptions].sort((a, b) => b.value - a.value)

  // 降级：找值更低的可用音质
  const lowerOptions = sorted.filter(o => o.value < quality)
  for (const opt of lowerOptions) {
    const urls = items.filter(i => i.quality === opt.key).map(i => i.url)
    if (urls.length > 0)
      return urls
  }

  // 升级：找值更高的可用音质
  const higherOptions = sorted.filter(o => o.value > quality).reverse()
  for (const opt of higherOptions) {
    const urls = items.filter(i => i.quality === opt.key).map(i => i.url)
    if (urls.length > 0)
      return urls
  }

  return []
}

// 获取 media 列表中可用的音质集合
export function getAvailableQualities(items: SongMediaItem[]): Set<AudioQuality> {
  const result = new Set<AudioQuality>()
  for (const opt of audioQualityOptions) {
    if (items.some(i => i.quality === opt.key))
      result.add(opt.value)
  }
  return result
}

export function buildPlaylistItem(song: SongListItemInfo, album: AlbumInfo): PlaylistItem {
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

export function buildPlaylistFromAlbum(album: AlbumInfo): PlaylistItem[] {
  return album.songs.map(song => buildPlaylistItem(song, album))
}

// ============ Media Session API ============

const MEDIA_SESSION_ARTWORK_SIZES = ['96px', '128px', '256px', '512px'] as const

export function updateMediaSession(song: PlaylistItem) {
  if (!('mediaSession' in navigator))
    return

  const artwork: MediaImage[] = MEDIA_SESSION_ARTWORK_SIZES
    .map(size => ({ src: getCoverUrl(song.albumPlatforms, size), sizes: `${size.replace('px', '')}x${size.replace('px', '')}`, type: 'image/jpeg' }))
    .filter(a => a.src !== '')

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.songName,
    artist: 'HOYO-MiX',
    album: song.albumName,
    artwork: artwork.length > 0 ? artwork : undefined,
  })
}

export function clearMediaSession() {
  if (!('mediaSession' in navigator))
    return
  navigator.mediaSession.metadata = null
}

export function setupMediaSessionHandlers(callbacks: {
  play: () => void
  pause: () => void
  playNext: () => void
  playPrev: () => void
  seek: (time: number) => void
}) {
  if (!('mediaSession' in navigator))
    return

  navigator.mediaSession.setActionHandler('play', callbacks.play)
  navigator.mediaSession.setActionHandler('pause', callbacks.pause)
  navigator.mediaSession.setActionHandler('nexttrack', callbacks.playNext)
  navigator.mediaSession.setActionHandler('previoustrack', callbacks.playPrev)
  navigator.mediaSession.setActionHandler('seekto', (action) => {
    if (action.seekTime != null)
      callbacks.seek(action.seekTime)
  })
}

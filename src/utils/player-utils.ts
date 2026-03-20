import type { ExportAlbum, ExportSong } from '@/types/export'
import type { AudioQuality, PlaylistItem, SongMediaItem } from '@/types/player'
import { audioQualityOptions, getQualityKey } from '@/constants'

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

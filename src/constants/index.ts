import type { AudioQuality } from '@/types/player'

export const apiBase = import.meta.env.VITE_API_BASE as string
export const resourceBase = import.meta.env.VITE_RESOURCE_BASE as string
export const feedbackPageUrl = import.meta.env.VITE_FEEDBACK_URL as string

export const audioQualityOptions: { value: AudioQuality, label: string, key: string, desc: string }[] = [
  { value: 9, label: '无损', key: 'flac', desc: 'FLAC 无损音质' },
  { value: 5, label: '较高', key: 'mp3_320', desc: 'MP3 320kbps' },
  { value: 1, label: '标准', key: 'mp3_128', desc: 'MP3 128kbps' },
]

export function getQualityLabel(q: AudioQuality): string {
  return audioQualityOptions.find(o => o.value === q)?.label ?? '高'
}

export function getQualityKey(q: AudioQuality): string {
  return audioQualityOptions.find(o => o.value === q)?.key ?? 'mp3_320'
}

export const productMap: { [key: string]: string }
  = {
    genshin: '原神',
    starrail: '崩坏：星穹铁道',
    zzz: '绝区零',
    honkai3: '崩坏3',
    honkai2: '崩坏学园2',
    wd: '未定事件簿',
  }

export const artistTypeSort = [
  '作曲',
  '编曲',
  '作词',
  '歌手',
  '演唱',
  '人声',
]

export const artistTypeSortLast = [
  '出品',
  '制作人',
]

export const lyricTimeRegex = /\[\d{2}:\d{2}\.\d{2,3}(?:\.\d{3})?\]/

export const mobileUserAgentRegex = /iPhone|phone|android|iPod|pad|iPad/i

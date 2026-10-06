import type { AudioQuality } from '@/types/player'

export const apiBase = import.meta.env.VITE_API_BASE as string
export const resourceBase = import.meta.env.VITE_RESOURCE_BASE as string
export const userApiBase = import.meta.env.VITE_USER_API_BASE as string

export const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

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

// 音质数值 → 中文名（媒体源 supportedQualities 展示用，未知值回退）
export function getQualityName(q: number): string {
  return audioQualityOptions.find(o => o.value === q)?.label ?? `音质${q}`
}

// 媒体源区域标签配置（名称与徽标样式）
export interface MediaSourceRegionOption {
  value: string
  label: string
  badgeClass: string
}

export const mediaSourceRegionOptions: MediaSourceRegionOption[] = [
  { value: 'china', label: '中国大陆', badgeClass: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' },
  { value: 'overseas', label: '海外', badgeClass: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400' },
  { value: 'global', label: '全球', badgeClass: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400' },
]

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

export const iOSUserAgentRegex = /iPhone|iPad|iPod/i

export const appTitle = 'HOYO-MiX Online'
export const appVersion = __APP_VERSION__
export const appDescription = 'HOYO-MiX Online 是一个米哈游游戏原声带数据网站，收录 HOYO-MiX 团队为《原神》、《崩坏》系列等作品创作的原声音乐，支持在线试听、专辑浏览、歌曲检索、创建与分享歌单。'
export const appGithubRepoUrl = 'https://github.com/orilights/hoyomix-web'

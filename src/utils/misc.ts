import type { ExportPlatforms } from '@/types/export'
import type { NeteaseClientSchemeParams } from '@/types/netease'
import { apiBase, feedbackPageUrl, productMap, resourceBase } from '@/constants'

export function getLyricrUrl(platforms: ExportPlatforms) {
  if (platforms.ncm) {
    return `${apiBase}/lyric/ncm/${platforms.ncm.id}.lrc`
  }
  if (platforms.qq) {
    return `${apiBase}/lyric/qq/${platforms.qq.id}.lrc`
  }
  return ''
}

export function getCoverUrl(platforms: ExportPlatforms, size?: string) {
  if (platforms.ncm) {
    return `${resourceBase}/cover/ncm/${platforms.ncm.id}${size ? `_${size}` : ''}.jpg`
  }
  if (platforms.qq) {
    return `${resourceBase}/cover/qq/${platforms.qq.id}${size ? `_${size}` : ''}.jpg`
  }
  return ''
}

export function getProductName(product: string = '') {
  return productMap[product] || product
}

export function getProductIconUrl(product: string = '', size?: string) {
  if (size) {
    return `/images/icon/${product}-${size}.png`
  }
  return `/images/icon/${product}.png`
}

export function goFeedbackPage() {
  window.open(feedbackPageUrl, '_blank')
}

export function isMobile() {
  const ua = navigator.userAgent
  return /iPhone|phone|android|iPod|pad|iPad/i.test(ua)
}

export function toBase64(text: string) {
  return window.btoa(text)
}

export function goNeteaseClient(params: NeteaseClientSchemeParams) {
  if (isMobile()) {
    // 唤起网易云音乐 App
    window.location.href = `orpheus://${params.type}/${params.id}`
  }
  else {
    // 唤起网易云音乐 PC 客户端
    const data = toBase64(JSON.stringify(params))
    window.open(`orpheus://${data}`, '_blank')
  }
}

export function getRandomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars.charAt(randomIndex)
  }
  return result
}

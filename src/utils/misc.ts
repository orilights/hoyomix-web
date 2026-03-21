import type { ExportPlatforms } from '@/types/export'
import type { NeteaseClientSchemeParams } from '@/types/netease'
import { feedbackPageUrl, mobileUserAgentRegex, productMap, resourceBase } from '@/constants'

export function getCoverUrl(platforms: ExportPlatforms, size: '96px' | '128px' | '256px' | '512px' | '800px') {
  if (platforms.ncm) {
    return `${resourceBase}/cover/ncm/${platforms.ncm.id}_${size}.jpg`
  }
  if (platforms.qq) {
    return `${resourceBase}/cover/qq/${platforms.qq.id}_${size}.jpg`
  }
  return ''
}

export function getProductName(product: string = '') {
  return productMap[product] || product
}

export function getProductIconUrl(productName: string, size?: string) {
  const ProductNameMap: Record<string, string> = {
    '原神': 'genshin',
    '崩坏3': 'honkai3',
    '崩坏：星穹铁道': 'starrail',
    '未定事件簿': 'wd',
    '绝区零': 'zzz',
    '崩坏学园2': 'honkai2',
  }
  if (size) {
    return `/images/icon/${ProductNameMap[productName] || productName}-${size}.png`
  }
  return `/images/icon/${ProductNameMap[productName] || productName}.png`
}

export function goFeedbackPage() {
  window.open(feedbackPageUrl, '_blank')
}

export function isMobile() {
  const ua = navigator.userAgent
  return mobileUserAgentRegex.test(ua)
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

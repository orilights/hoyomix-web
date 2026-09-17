import type { PlatformInfoMap } from '@/types/core'
import type { NeteaseClientSchemeParams } from '@/types/netease'
import { iOSUserAgentRegex, mobileUserAgentRegex, productMap, resourceBase } from '@/constants'

export function getCoverUrl(platforms: PlatformInfoMap, size: '96px' | '128px' | '256px' | '512px' | '800px') {
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

export function getProductCode(productName: string): string {
  return Object.entries(productMap).find(([, name]) => name === productName)?.[0] ?? ''
}

export function getProductIconUrl(productName: string, size?: string) {
  const code = getProductCode(productName) || productName
  if (size) {
    return `/images/icon/${code}-${size}.png`
  }
  return `/images/icon/${code}.png`
}

export function isMobile() {
  const ua = navigator.userAgent
  return mobileUserAgentRegex.test(ua)
}

export function isIOS() {
  const ua = navigator.userAgent
  return iOSUserAgentRegex.test(ua)
    || (
      navigator.platform === 'MacIntel'
      && navigator.maxTouchPoints > 1
    )
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

// 清洗搜索高亮 HTML，仅保留 <em> 标签，转义其他 HTML
const RE_AMP = /&/g
const RE_LT = /</g
const RE_GT = />/g
const RE_EM_OPEN = /&lt;em&gt;/g
const RE_EM_CLOSE = /&lt;\/em&gt;/g

export function sanitizeHighlight(html: string): string {
  return html
    .replace(RE_AMP, '&amp;')
    .replace(RE_LT, '&lt;')
    .replace(RE_GT, '&gt;')
    .replace(RE_EM_OPEN, '<em>')
    .replace(RE_EM_CLOSE, '</em>')
}

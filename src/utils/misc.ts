import type { NeteaseClientSchemeParams } from '@/types/netease'
import { feedbackPageUrl, productMap, resourceBase } from '@/constants'

export function getCoverUrl(service: string, id: number, size?: string) {
  if (size) {
    return `${resourceBase}/cover/${service}/${size}/${id}.jpg`
  }
  return `${resourceBase}/cover/${service}/${id}.jpg`
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

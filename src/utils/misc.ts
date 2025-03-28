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

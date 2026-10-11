import { resourceBase } from '@/constants'

export interface ImageCacheStats {
  bytes: number
  count: number
  maxBytes: number
}

export const imageCacheSupported = window.isSecureContext && 'serviceWorker' in navigator && 'caches' in window
let registration: Promise<ServiceWorkerRegistration> | undefined

export function registerImageCache() {
  if (!imageCacheSupported)
    return Promise.reject(new Error('当前浏览器或访问环境不支持图片缓存，请使用 HTTPS 或 localhost'))
  registration ??= navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}image-cache-sw.js?resourceBase=${encodeURIComponent(new URL(resourceBase, window.location.href).href)}`,
    { scope: import.meta.env.BASE_URL, updateViaCache: 'none' },
  ).catch((error: unknown) => {
    registration = undefined
    throw error
  })
  return registration
}

export async function requestImageCache(action: 'stats' | 'clear'): Promise<ImageCacheStats> {
  const registered = await registerImageCache()
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => finish(new Error('图片缓存响应超时，请稍后重试')), 10000)
    const worker = registered.installing ?? registered.waiting ?? registered.active
    function finish(error?: Error, stats?: ImageCacheStats) {
      window.clearTimeout(timeout)
      worker?.removeEventListener('statechange', send)
      channel.port1.close()
      channel.port2.close()
      if (error)
        reject(error)
      else if (stats)
        resolve(stats)
    }
    channel.port1.onmessage = ({ data }) => {
      if (data.ok)
        finish(undefined, { bytes: data.bytes, count: data.count, maxBytes: data.maxBytes })
      else
        finish(new Error(data.error))
    }
    function send() {
      if (worker?.state === 'activated') {
        worker.removeEventListener('statechange', send)
        worker.postMessage({ type: `image-cache:${action}` }, [channel.port2])
      }
    }
    if (!worker) {
      finish(new Error('图片缓存尚未就绪，请稍后重试'))
    }
    else {
      worker.addEventListener('statechange', send)
      send()
    }
  })
}

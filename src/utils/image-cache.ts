import { resourceBase } from '@/constants'
import { LocalizedError } from '@/i18n/error'

export interface ImageCacheStats {
  bytes: number
  count: number
  maxBytes: number
}

export const imageCacheSupported = window.isSecureContext && 'serviceWorker' in navigator && 'caches' in window
let registration: Promise<ServiceWorkerRegistration> | undefined

export function registerImageCache() {
  if (!imageCacheSupported)
    return Promise.reject(new LocalizedError('image_cache.image_caching_is_unavailable_use_https_or_localhost'))
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
    const timeout = window.setTimeout(() => finish(new LocalizedError('image_cache.image_cache_request_timed_out_please_try_again_later')), 10000)
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
        finish(new LocalizedError('image_cache.storage_unavailable'))
    }
    function send() {
      if (worker?.state === 'activated') {
        worker.removeEventListener('statechange', send)
        worker.postMessage({ type: `image-cache:${action}` }, [channel.port2])
      }
    }
    if (!worker) {
      finish(new LocalizedError('image_cache.image_cache_is_not_ready_please_try_again_later'))
    }
    else {
      worker.addEventListener('statechange', send)
      send()
    }
  })
}

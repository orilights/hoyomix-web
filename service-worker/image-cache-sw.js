import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { CACHE_NAME, createImageCacheStorage } from './image-cache-storage.js'

const resourceBase = new URL(globalThis.location.href).searchParams.get('resourceBase')
const imageBase = resourceBase ? new URL(`${resourceBase.replace(/\/+$/, '')}/cover/`, globalThis.location.origin) : null
const assetBase = new URL('https://icdn.amarea.cn/gi-assets/img/')
const storage = createImageCacheStorage(globalThis.caches)

function isImageResource({ url }) {
  return (url.origin === assetBase.origin && url.pathname.startsWith(assetBase.pathname))
    || (imageBase && url.origin === imageBase.origin && url.pathname.startsWith(imageBase.pathname)
      && /^(?:ncm|qq)\/[^/]+_(?:96|128|256|512|800)px\.jpg$/.test(url.pathname.slice(imageBase.pathname.length)))
}

const strategy = new CacheFirst({
  cacheName: CACHE_NAME,
  plugins: [{
    handlerWillStart({ state }) {
      state.generation = storage.generation
    },
    requestWillFetch({ request }) {
      return new Request(request, { mode: 'cors', credentials: 'omit' })
    },
    async cacheWillUpdate({ request, response, state }) {
      if (response.status === 200 && (new URL(request.url).origin === assetBase.origin
        || response.headers.get('content-type')?.startsWith('image/'))) {
        // Workbox 在后台调用此钩子。插件负责按字节限制的原子写入，
        // 返回 null 禁止 Workbox 再执行一次不受容量限制的 cache.put。
        await storage.write(request, response, state.generation).catch(() => {})
      }
      return null
    },
    handlerDidError({ request }) {
      // 缓存不可用或 CORS 失败时保留原始图片请求的加载方式。
      return fetch(request)
    },
  }],
})

registerRoute(isImageResource, strategy, 'GET')
globalThis.addEventListener('install', event => event.waitUntil(globalThis.skipWaiting()))
clientsClaim()

globalThis.addEventListener('message', (event) => {
  const port = event.ports[0]
  if (!port || !['image-cache:stats', 'image-cache:clear'].includes(event.data?.type))
    return
  const result = event.data.type === 'image-cache:clear' ? storage.clear() : storage.stats()
  event.waitUntil(result.then(stats => port.postMessage({ ok: true, ...stats }))
    .catch(() => port.postMessage({ ok: false, error: '无法访问图片缓存，请检查浏览器的存储权限' })))
})

const CACHE_NAME = 'hoyomix-images-v1'
const MAX_BYTES = 100 * 1024 * 1024
const SIZE_HEADER = 'x-hoyomix-image-bytes'
const resourceBase = new URL(globalThis.location.href).searchParams.get('resourceBase')
const imageBase = resourceBase ? new URL(`${resourceBase.replace(/\/+$/, '')}/cover/`, globalThis.location.origin) : null
let queue = Promise.resolve()
let generation = 0

function serialize(operation) {
  const result = queue.then(operation)
  queue = result.catch(() => {})
  return result
}

async function entries(cache) {
  const result = []
  for (const request of await cache.keys()) {
    const response = await cache.match(request)
    const size = Number(response?.headers.get(SIZE_HEADER))
    if (!Number.isSafeInteger(size) || size <= 0) {
      await cache.delete(request)
      continue
    }
    result.push({ request, size })
  }
  return result
}

async function stats() {
  const items = await entries(await caches.open(CACHE_NAME))
  return { bytes: items.reduce((sum, item) => sum + item.size, 0), count: items.length, maxBytes: MAX_BYTES }
}

globalThis.addEventListener('install', event => event.waitUntil(globalThis.skipWaiting()))
globalThis.addEventListener('activate', event => event.waitUntil(globalThis.clients.claim()))

globalThis.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Match only the configured resource service's album cover paths.
  if (!imageBase || event.request.method !== 'GET'
    || url.origin !== imageBase.origin || !url.pathname.startsWith(imageBase.pathname)
    || !/^(?:ncm|qq)\/[^/]+_(?:96|128|256|512|800)px\.jpg$/.test(url.pathname.slice(imageBase.pathname.length))) {
    return
  }
  const requestGeneration = generation
  event.respondWith((async () => {
    try {
      const cached = await serialize(async () => (await caches.open(CACHE_NAME)).match(event.request.url))
      if (cached)
        return cached
    }
    catch {
      // Storage failures must not prevent normal image loading.
    }
    let response
    try {
      response = await fetch(new Request(event.request, { mode: 'cors', credentials: 'omit' }))
    }
    catch {
      return fetch(event.request)
    }
    if (response.ok && response.status === 200 && response.headers.get('content-type')?.startsWith('image/')) {
      const copy = response.clone()
      event.waitUntil((async () => {
        const blob = await copy.blob()
        if (!blob.size || blob.size > MAX_BYTES)
          return
        await serialize(async () => {
          // Clearing invalidates downloads started before the clear request.
          if (requestGeneration !== generation)
            return
          const cache = await caches.open(CACHE_NAME)
          if (await cache.match(event.request.url))
            return
          const items = await entries(cache)
          let bytes = items.reduce((sum, item) => sum + item.size, 0)
          for (const item of items) {
            if (bytes + blob.size <= MAX_BYTES)
              break
            await cache.delete(item.request)
            bytes -= item.size
          }
          const headers = new Headers(response.headers)
          headers.delete('content-encoding')
          headers.delete('content-length')
          headers.delete('vary')
          headers.set(SIZE_HEADER, String(blob.size))
          await cache.put(event.request.url, new Response(blob, { headers }))
        })
      })().catch(() => {}))
    }
    return response
  })())
})

globalThis.addEventListener('message', (event) => {
  const port = event.ports[0]
  if (!port || !['image-cache:stats', 'image-cache:clear'].includes(event.data?.type))
    return
  const clear = event.data.type === 'image-cache:clear'
  if (clear)
    generation++
  event.waitUntil(serialize(async () => {
    if (clear)
      await caches.delete(CACHE_NAME)
    port.postMessage({ ok: true, ...await stats() })
  }).catch(() => port.postMessage({ ok: false, error: '无法访问图片缓存，请检查浏览器的存储权限' })))
})

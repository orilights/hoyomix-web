export const CACHE_NAME = 'hoyomix-images-v1'
export const MAX_BYTES = 100 * 1024 * 1024
const SIZE_HEADER = 'x-hoyomix-image-bytes'

// 只串行化写入和清理；图片读取不经过此队列。
export function createImageCacheStorage(cacheStorage, maxBytes = MAX_BYTES) {
  let queue = Promise.resolve()
  let generation = 0
  let index
  let bytes = 0

  function serialize(operation) {
    const result = queue.then(operation)
    queue = result.catch(() => {
      index = undefined
    })
    return result
  }

  async function loadIndex(cache) {
    if (index)
      return
    const items = new Map()
    const requests = await cache.keys()
    // 每次 Worker 启动最多扫描一次，分批并行读取旧缓存的大小元数据。
    for (let offset = 0; offset < requests.length; offset += 32) {
      const batch = await Promise.all(requests.slice(offset, offset + 32).map(async (request) => {
        const response = await cache.match(request)
        const size = Number(response?.headers.get(SIZE_HEADER))
        if (!Number.isSafeInteger(size) || size <= 0) {
          await cache.delete(request)
          return null
        }
        return [request.url, size]
      }))
      for (const item of batch) {
        if (item)
          items.set(...item)
      }
    }
    index = items
    bytes = [...items.values()].reduce((sum, size) => sum + size, 0)
  }

  function stats() {
    return serialize(async () => {
      await loadIndex(await cacheStorage.open(CACHE_NAME))
      return { bytes, count: index.size, maxBytes }
    })
  }

  function clear() {
    // 立即失效此前开始的下载，包括尚未读取完响应体的写入。
    generation++
    return serialize(async () => {
      await cacheStorage.delete(CACHE_NAME)
      index = new Map()
      bytes = 0
      return { bytes, count: 0, maxBytes }
    })
  }

  async function write(request, response, requestGeneration) {
    const blob = await response.blob()
    if (!blob.size || blob.size > maxBytes || requestGeneration !== generation)
      return
    await serialize(async () => {
      if (requestGeneration !== generation)
        return
      const cache = await cacheStorage.open(CACHE_NAME)
      await loadIndex(cache)
      if (index.has(request.url))
        return
      for (const [url, size] of index) {
        if (bytes + blob.size <= maxBytes)
          break
        await cache.delete(url)
        index.delete(url)
        bytes -= size
      }
      const headers = new Headers(response.headers)
      headers.delete('content-encoding')
      headers.delete('content-length')
      headers.delete('vary')
      headers.set(SIZE_HEADER, String(blob.size))
      await cache.put(request.url, new Response(blob, { headers }))
      index.set(request.url, blob.size)
      bytes += blob.size
    })
  }

  return {
    stats,
    clear,
    write,
    get generation() {
      return generation
    },
  }
}

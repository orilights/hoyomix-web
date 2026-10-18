import type { Plugin } from 'vite'
import path from 'node:path'
import { build } from 'rolldown'

// 独立打包为 classic Worker，沿用原有 URL 和作用域，不预缓存 SPA 资源。
export default function imageCacheWorker(): Plugin {
  const entry = path.resolve(import.meta.dirname, '../service-worker/image-cache-sw.js')
  async function bundle() {
    const result = await build({
      input: entry,
      platform: 'browser',
      transform: { define: { 'process.env.NODE_ENV': JSON.stringify('production') } },
      output: { format: 'iife', minify: true },
      write: false,
    })
    const chunk = result.output.find(item => item.type === 'chunk')
    if (!chunk)
      throw new Error('图片缓存 Worker 打包失败')
    return chunk.code
  }
  return {
    name: 'image-cache-worker',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== `${server.config.base}image-cache-sw.js`)
          return next()
        try {
          response.setHeader('Content-Type', 'application/javascript')
          response.setHeader('Cache-Control', 'no-cache')
          response.end(await bundle())
        }
        catch (error) {
          next(error)
        }
      })
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'image-cache-sw.js', source: await bundle() })
    },
  }
}

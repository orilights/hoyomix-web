const trailingSlashRegex = /\/+$/

export async function pingMediaSource(baseUrl: string, signal?: AbortSignal): Promise<number | null> {
  const url = `${baseUrl.replace(trailingSlashRegex, '')}/test`
  const start = performance.now()
  try {
    await fetch(url, {
      method: 'HEAD',
      credentials: 'omit',
      signal: signal ?? AbortSignal.timeout(5000),
    })
    return performance.now() - start
  }
  catch {
    return null
  }
}

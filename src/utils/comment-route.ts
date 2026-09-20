const STORAGE_KEY = 'comment-route-map'
const MAX_ROUTES = 100

function readRoutes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>
  }
  catch {
    return {}
  }
}

export function rememberCommentRoute(postId: string, path: string) {
  if (!path.startsWith('/'))
    return
  try {
    const routes = readRoutes()
    delete routes[postId]
    routes[postId] = path
    const entries = Object.entries(routes).slice(-MAX_ROUTES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)))
  }
  catch {}
}

export function getRememberedCommentRoute(postId: string) {
  const path = readRoutes()[postId]
  return path?.startsWith('/') ? path : null
}

const scrollY = ref(0)
let scrollElement: HTMLElement | null = null
let pageRender = Promise.resolve()
let finishPageRender: (() => void) | undefined
let cancelScrollRestoration: (() => void) | undefined

export function beginPageRender() {
  finishPageRender?.()
  pageRender = new Promise<void>((resolve) => {
    finishPageRender = resolve
  })
}

export function completePageRender() {
  finishPageRender?.()
  finishPageRender = undefined
}

export function waitForPageRender() {
  return pageRender
}

export function getPageScrollPosition() {
  return { left: scrollElement?.scrollLeft ?? 0, top: scrollElement?.scrollTop ?? 0 }
}

export function cancelPageScrollRestoration() {
  cancelScrollRestoration?.()
}

export function restorePageScrollPosition(position: { left: number, top: number }) {
  cancelPageScrollRestoration()
  const startedAt = performance.now()
  let frame = 0

  const stop = () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('wheel', stop)
    window.removeEventListener('touchstart', stop)
    window.removeEventListener('pointerdown', stop)
    window.removeEventListener('keydown', stop)
    cancelScrollRestoration = undefined
  }

  const restore = () => {
    if (scrollElement) {
      scrollElement.scrollTo({ ...position, behavior: 'instant' })
      scrollY.value = scrollElement.scrollTop
      if (Math.abs(scrollElement.scrollTop - position.top) < 1 && Math.abs(scrollElement.scrollLeft - position.left) < 1) {
        stop()
        return
      }
    }

    // 数据异步加载时页面可能暂时不够高，继续等待布局；用户操作或下一次导航会取消。
    if (performance.now() - startedAt < 5000)
      frame = requestAnimationFrame(restore)
    else
      stop()
  }

  cancelScrollRestoration = stop
  window.addEventListener('wheel', stop, { passive: true })
  window.addEventListener('touchstart', stop, { passive: true })
  window.addEventListener('pointerdown', stop, { passive: true })
  window.addEventListener('keydown', stop)
  restore()
}

export function setPageScrollElement(element: HTMLElement | null) {
  scrollElement = element
  scrollY.value = element?.scrollTop ?? 0
}

export function updatePageScroll(event: Event) {
  scrollY.value = (event.target as HTMLElement).scrollTop
}

export function scrollPageToTop(behavior: ScrollBehavior = 'auto') {
  scrollElement?.scrollTo({ top: 0, behavior })
}

export function scrollPageToElement(element: Element, offset = 0): boolean {
  if (!scrollElement)
    return false

  const top = scrollElement.scrollTop + element.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top - offset
  scrollElement.scrollTo({ top, behavior: 'auto' })
  return true
}

export function usePageScroll() {
  return { scrollY, scrollPageToTop }
}

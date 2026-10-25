import type { ObjectDirective } from 'vue'
import '@/assets/cover-reveal.css'

// 所有网格共用观察器，仅跟踪尚未入屏的专辑项和歌单项。
let observer: IntersectionObserver | undefined
const pending = new Set<Element>()

function disconnectIfIdle() {
  if (pending.size)
    return
  observer?.disconnect()
  observer = undefined
}

export const vRevealCover: ObjectDirective<HTMLElement> = {
  mounted(element) {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !pending.has(entry.target))
          continue
        entry.target.classList.remove('cover-reveal-pending')
        entry.target.classList.add('cover-reveal-enter')
        observer?.unobserve(entry.target)
        pending.delete(entry.target)
      }
      disconnectIfIdle()
    }, { threshold: 0.08 })
    element.classList.add('cover-reveal-pending')
    pending.add(element)
    observer.observe(element)
  },
  unmounted(element) {
    observer?.unobserve(element)
    pending.delete(element)
    disconnectIfIdle()
  },
}

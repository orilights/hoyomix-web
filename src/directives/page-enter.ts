import type { ObjectDirective } from 'vue'
import '@/assets/page-enter.css'

const cleanups = new WeakMap<HTMLElement, () => void>()

export const vPageEnter: ObjectDirective<HTMLElement, number | false> = {
  mounted(element, { value }) {
    // 移动端未选中的标签内容不参与页面入场，切换标签时直接展示。
    if (value === false || !element.getClientRects().length || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    const cleanup = () => {
      element.removeEventListener('animationend', onFinished)
      element.removeEventListener('animationcancel', onFinished)
      element.classList.remove('page-enter-active')
      element.style.removeProperty('--page-enter-delay')
      cleanups.delete(element)
    }
    function onFinished(event: AnimationEvent) {
      if (event.target === element && event.animationName === 'page-block-rise')
        cleanup()
    }
    element.style.setProperty('--page-enter-delay', `${value ?? 0}ms`)
    element.addEventListener('animationend', onFinished)
    element.addEventListener('animationcancel', onFinished)
    element.classList.add('page-enter-active')
    cleanups.set(element, cleanup)
  },
  unmounted(element) {
    cleanups.get(element)?.()
  },
}

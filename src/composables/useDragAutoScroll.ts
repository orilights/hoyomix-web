import { useEventListener } from '@vueuse/core'

export function useDragAutoScroll(getViewport: () => HTMLElement | null | undefined, getEdge: () => number) {
  const isDragging = ref(false)
  let pointerY = 0
  let frame = 0
  let previousTime = 0

  function stop() {
    isDragging.value = false
    cancelAnimationFrame(frame)
    frame = 0
    previousTime = 0
  }

  function onPointerMove(event: MouseEvent | TouchEvent) {
    if (!isDragging.value)
      return
    const pointer = 'touches' in event ? event.touches[0] : event
    if (pointer)
      pointerY = pointer.clientY
  }

  function scroll(time: number) {
    if (!isDragging.value)
      return
    const viewport = getViewport()
    if (viewport) {
      const bounds = viewport.getBoundingClientRect()
      const edge = Math.min(getEdge(), bounds.height / 3)
      if (edge > 0) {
        const velocity = pointerY < bounds.top + edge
          ? -Math.min(1, Math.max(0, (bounds.top + edge - pointerY) / edge))
          : Math.min(1, Math.max(0, (pointerY - bounds.bottom + edge) / edge))
        const elapsed = previousTime ? Math.min(time - previousTime, 50) : 0
        viewport.scrollTop += velocity * elapsed * 0.5
      }
    }
    previousTime = time
    frame = requestAnimationFrame(scroll)
  }

  function start(event: { originalEvent?: MouseEvent | TouchEvent }) {
    stop()
    // Avoid scrolling from stale coordinates before the first movement event.
    if (!event.originalEvent)
      return
    isDragging.value = true
    onPointerMove(event.originalEvent)
    frame = requestAnimationFrame(scroll)
  }

  // Native dragging stops pointermove; capture dragover above fixed bars too.
  useEventListener(document, 'dragover', onPointerMove, { capture: true })
  useEventListener(document, 'pointermove', onPointerMove, { capture: true, passive: true })
  useEventListener(document, 'touchmove', onPointerMove, { capture: true, passive: true })
  onUnmounted(stop)

  return { isDragging, start, stop }
}

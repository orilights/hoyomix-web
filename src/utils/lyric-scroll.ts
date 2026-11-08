export function animateWordLyricScroll(element: HTMLElement, target: number): () => void {
  const from = element.scrollTop
  const to = Math.max(0, Math.min(target, element.scrollHeight - element.clientHeight))
  const start = performance.now()
  let frame = 0
  function tick(now: number) {
    const progress = Math.min(1, Math.max(0, (now - start) / 600))
    const eased = 1 - (1 - progress) ** 3
    element.scrollTop = from + (to - from) * eased
    if (progress < 1)
      frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

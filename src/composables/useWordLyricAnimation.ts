import type { InjectionKey, Ref } from 'vue'
import { useDocumentVisibility, usePreferredReducedMotion, useResizeObserver } from '@vueuse/core'
import { usePlayerStore } from '@/store/player'
import { getAudioPlayer } from '@/utils/player'

interface AnimatedLine {
  element: HTMLElement
  visible: (value: boolean) => void
  paint: (time: number, discrete: boolean) => void
}
interface WordLyricAnimation {
  register: (line: AnimatedLine) => () => void
  refresh: () => void
}
export const wordLyricAnimationKey: InjectionKey<WordLyricAnimation> = Symbol('word-lyric-animation')

export function useWordLyricAnimation(root: Ref<HTMLElement | null>, enabled: Ref<boolean>) {
  const player = usePlayerStore()
  const visibility = useDocumentVisibility()
  const reducedMotion = usePreferredReducedMotion()
  const onscreen = ref(false)
  const lines = new Map<Element, AnimatedLine>()
  const visible = new Set<AnimatedLine>()
  let observer: IntersectionObserver | undefined
  let screenObserver: IntersectionObserver | undefined
  let frame = 0
  const continuous = typeof CSS !== 'undefined' && (CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text'))

  function paint() {
    if (!enabled.value || !onscreen.value || visibility.value !== 'visible')
      return
    const time = (getAudioPlayer().currentTime + player.lyricsOffset) * 1000
    const discrete = !continuous || reducedMotion.value === 'reduce'
    for (const line of visible)
      line.paint(time, discrete)
  }
  const running = computed(() => enabled.value && onscreen.value && player.isFullscreen && player.isPlaying && !player.isLoading && visibility.value === 'visible')
  function tick() {
    frame = 0
    if (!running.value)
      return
    paint()
    frame = requestAnimationFrame(tick)
  }
  function refresh() {
    paint()
    if (running.value && !frame)
      frame = requestAnimationFrame(tick)
  }
  watch([running, enabled, onscreen, visibility, () => player.currentTime, () => player.lyricsOffset, reducedMotion], () => {
    if (!running.value && frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
    refresh()
  }, { flush: 'post' })

  function observe() {
    observer?.disconnect()
    screenObserver?.disconnect()
    visible.clear()
    if (!enabled.value || !root.value) {
      onscreen.value = false
      return
    }
    if (!root.value.clientHeight || !root.value.clientWidth)
      onscreen.value = false
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const line = lines.get(entry.target)
        if (!line)
          continue
        line.visible(entry.isIntersecting)
        if (entry.isIntersecting)
          visible.add(line)
        else
          visible.delete(line)
      }
      refresh()
    }, { root: root.value, rootMargin: `${root.value.clientHeight}px 0px` })
    screenObserver = new IntersectionObserver(entries => onscreen.value = entries.some(e => e.isIntersecting))
    screenObserver.observe(root.value)
    for (const line of lines.values())
      observer.observe(line.element)
  }
  watch([root, enabled], observe, { flush: 'post' })
  useResizeObserver(root, observe)
  provide(wordLyricAnimationKey, {
    register(line) {
      lines.set(line.element, line)
      observer?.observe(line.element)
      return () => {
        observer?.unobserve(line.element)
        lines.delete(line.element)
        visible.delete(line)
      }
    },
    refresh,
  })
  onUnmounted(() => {
    cancelAnimationFrame(frame)
    observer?.disconnect()
    screenObserver?.disconnect()
    lines.clear()
    visible.clear()
  })
  return { reducedMotion }
}

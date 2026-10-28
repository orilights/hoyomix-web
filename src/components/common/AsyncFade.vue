<script setup lang="ts">
import { asyncFadeHeightKey } from '@/constants/async-fade'

const props = withDefaults(defineProps<{ animateHeight?: boolean }>(), { animateHeight: undefined })
const inheritedAnimateHeight = inject(asyncFadeHeightKey, false)
const animateHeight = computed(() => props.animateHeight ?? inheritedAnimateHeight)

let previousHeight: number | undefined
const cleanups = new Map<Element, () => void>()

function beforeLeave(element: Element) {
  previousHeight = animateHeight.value ? element.getBoundingClientRect().height : undefined
  cleanups.get(element)?.()
}

function enter(element: Element) {
  const fromHeight = previousHeight
  previousHeight = undefined
  if (!animateHeight.value || !(element instanceof HTMLElement) || fromHeight === undefined
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const styles = getComputedStyle(element)
  const targetHeight = Number.parseFloat(styles.height)
  const extraHeight = element.offsetHeight - targetHeight
  if (!Number.isFinite(targetHeight) || Math.abs(element.offsetHeight - fromHeight) < 1)
    return

  const overflow = element.style.getPropertyValue('overflow')
  const overflowPriority = element.style.getPropertyPriority('overflow')
  element.style.setProperty('overflow', 'hidden')
  const animation = element.animate([
    { height: `${Math.max(0, fromHeight - extraHeight)}px` },
    { height: `${targetHeight}px` },
  ], { duration: 300, easing: 'ease-in-out' })
  const cleanup = () => {
    animation.onfinish = null
    animation.oncancel = null
    animation.cancel()
    if (overflow)
      element.style.setProperty('overflow', overflow, overflowPriority)
    else
      element.style.removeProperty('overflow')
    cleanups.delete(element)
  }
  animation.onfinish = cleanup
  animation.oncancel = cleanup
  cleanups.set(element, cleanup)
}

onBeforeUnmount(() => {
  for (const cleanup of cleanups.values())
    cleanup()
})
</script>

<template>
  <Transition name="async-fade" mode="out-in" appear @before-leave="beforeLeave" @enter="enter">
    <slot />
  </Transition>
</template>

<style scoped>
.async-fade-enter-active {
  transition: opacity 0.5s ease;
}

.async-fade-enter-from {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .async-fade-enter-active {
    transition: none;
  }
}
</style>

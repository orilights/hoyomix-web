<script setup lang="ts">
import { useElementSize } from '@vueuse/core'

defineProps<{ text: string, paused?: boolean }>()

const viewport = useTemplateRef<HTMLElement>('viewport')
const content = useTemplateRef<HTMLElement>('content')
const { width: viewportWidth } = useElementSize(viewport)
const { width: contentWidth } = useElementSize(content)
const overflows = computed(() => viewportWidth.value > 0 && contentWidth.value > viewportWidth.value + 1)
const trackStyle = computed(() => ({
  '--scroll-distance': `${-(contentWidth.value + 32)}px`,
  '--scroll-duration': `${(contentWidth.value + 32) / 32 + 2}s`,
}))
</script>

<template>
  <span ref="viewport" class="scrolling-text block overflow-hidden whitespace-nowrap" :class="{ 'text-left': overflows }">
    <span :key="text" class="scrolling-text-track" :class="{ 'scrolling-text-moving': overflows, 'scrolling-text-paused': paused }" :style="trackStyle">
      <span ref="content" class="shrink-0">{{ text }}</span>
      <span v-if="overflows" class="shrink-0" aria-hidden="true">{{ text }}</span>
    </span>
  </span>
</template>

<style scoped>
.scrolling-text-track {
  display: inline-flex;
  gap: 32px;
  vertical-align: top;
}
.scrolling-text-moving {
  animation: scrolling-text var(--scroll-duration) linear infinite;
}
.scrolling-text-paused {
  animation-play-state: paused;
}
@keyframes scrolling-text {
  0%, 10% { transform: translateX(0); }
  100% { transform: translateX(var(--scroll-distance)); }
}
@media (prefers-reduced-motion: reduce) {
  .scrolling-text { text-overflow: ellipsis; }
  .scrolling-text-track { display: inline; animation: none; }
  .scrolling-text-track > [aria-hidden] { display: none; }
}
</style>

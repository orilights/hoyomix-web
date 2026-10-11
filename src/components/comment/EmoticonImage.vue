<script setup lang="ts">
const props = withDefaults(defineProps<{ src: string, alt: string, enabled?: boolean }>(), { enabled: true })
const emit = defineEmits<{ error: [event: Event] }>()
const image = useTemplateRef<HTMLImageElement>('image')
const requestedSrc = ref<string>()
const imageSrc = computed(() => requestedSrc.value === props.src ? requestedSrc.value : undefined)
let observer: IntersectionObserver | undefined

// 不提前设置 src：原生 loading="lazy" 仍可能预取视口附近的图片。
watch([image, () => props.src, () => props.enabled], ([element, src, enabled]) => {
  observer?.disconnect()
  observer = undefined
  if (!element || !enabled || requestedSrc.value === src)
    return
  // 贴边时 isIntersecting 可能为 true、相交面积却为 0。
  // 使用极小正阈值，确保随后进入可见区域仍会收到通知。
  observer = new IntersectionObserver((entries) => {
    if (props.src !== src || !props.enabled)
      return
    if (entries.some(entry => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0)) {
      requestedSrc.value = src
      observer?.disconnect()
      observer = undefined
    }
  }, { rootMargin: '0px', threshold: 0.001 })
  observer.observe(element)
}, { flush: 'post' })

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <img ref="image" :src="imageSrc" :alt="alt" loading="eager" decoding="async" referrerpolicy="no-referrer" @error="emit('error', $event)">
</template>

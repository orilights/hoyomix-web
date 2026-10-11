<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { useSpectrumColor } from '@/composables/useSpectrumColor'
import { usePlayerStore } from '@/store/player'
import { getAudioPlayer } from '@/utils/player'
import { getSpectrumLayout } from '@/utils/spectrum'

const props = defineProps<{
  active: boolean
  preview?: boolean
}>()
const player = usePlayerStore()
const color = useSpectrumColor()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const active = computed(() => props.active && !player.isLoading && player.enableAudioContext)
let animationId = 0
let previousTime = 0
let values: number[] = []

function draw(time: number) {
  const element = canvas.value
  const ctx = element?.getContext('2d')
  if (!element || !ctx)
    return
  const { width, height } = element.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  if (element.width !== Math.round(width * dpr) || element.height !== Math.round(height * dpr)) {
    element.width = Math.round(width * dpr)
    element.height = Math.round(height * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const settings = player.spectrumSettings
  const data = active.value ? getAudioPlayer().getFrequencyData() : null
  // 用实际帧间隔衰减，暂停/加载时约一秒回落，不受屏幕刷新率影响。
  const decay = Math.exp(-Math.max(0, time - previousTime) / 200)
  previousTime = time
  if (values.length !== settings.count) {
    const previousValues = values
    values = Array.from({ length: settings.count }, (_, i) =>
      previousValues[Math.round(i / (settings.count - 1) * (previousValues.length - 1))] ?? 0)
  }
  const { gap, barWidth } = getSpectrumLayout(width, settings)
  ctx.fillStyle = color.value
  let settling = false
  for (let i = 0; i < settings.count; i++) {
    // 保持相同低中频范围；改变数量时插值，避免高数量产生空柱。
    const index = i / (settings.count - 1) * Math.min(63, (data?.length ?? 64) - 1)
    const lower = Math.floor(index)
    const fraction = index - lower
    const target = data
      ? (data[lower] * (1 - fraction) + data[Math.min(lower + 1, data.length - 1)] * fraction) / 255
      : props.preview ? 0.15 + Math.abs(Math.sin(i / settings.count * 12)) * 0.65 : 0
    // 实时频谱保持原响应；失去音频数据后保留上一帧并平滑靠近目标。
    const next = data ? target : target + (values[i]! - target) * decay
    const value = Math.abs(next - target) < 0.001 ? target : next
    values[i] = value
    settling ||= value !== target
    const barHeight = data || props.preview ? Math.max(2, value * height) : value * height
    if (barHeight <= 0)
      continue
    ctx.globalAlpha = (1 - settings.opacity / 100) * (0.5 + value * 0.5)
    ctx.fillRect(i * (barWidth + gap), height - barHeight, barWidth, barHeight)
  }
  return settling
}

function animate(time: number) {
  animationId = 0
  const settling = draw(time)
  if (active.value || settling)
    animationId = requestAnimationFrame(animate)
}

function startAnimation() {
  if (!animationId) {
    previousTime = performance.now()
    animationId = requestAnimationFrame(animate)
  }
}

watch(active, startAnimation, { flush: 'post' })
watch([() => player.spectrumSettings, color, () => props.preview], startAnimation, { deep: true, flush: 'post' })
useResizeObserver(canvas, startAnimation)
onMounted(startAnimation)
onBeforeUnmount(() => cancelAnimationFrame(animationId))
</script>

<template>
  <canvas ref="canvas" class="block w-full h-full" aria-hidden="true" />
</template>

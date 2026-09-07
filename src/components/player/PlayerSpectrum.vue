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
let animationId = 0

function draw() {
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
  const data = props.active ? getAudioPlayer().getFrequencyData() : null
  if (!data && !props.preview)
    return
  const { gap, barWidth } = getSpectrumLayout(width, settings)
  ctx.fillStyle = color.value
  for (let i = 0; i < settings.count; i++) {
    // 保持相同低中频范围；改变数量时插值，避免高数量产生空柱。
    const index = i / (settings.count - 1) * Math.min(63, (data?.length ?? 64) - 1)
    const lower = Math.floor(index)
    const fraction = index - lower
    const value = data
      ? (data[lower] * (1 - fraction) + data[Math.min(lower + 1, data.length - 1)] * fraction) / 255
      : 0.15 + Math.abs(Math.sin(i / settings.count * 12)) * 0.65
    const barHeight = Math.max(2, value * height)
    ctx.globalAlpha = (1 - settings.opacity / 100) * (0.5 + value * 0.5)
    ctx.fillRect(i * (barWidth + gap), height - barHeight, barWidth, barHeight)
  }
}

function animate() {
  draw()
  if (props.active)
    animationId = requestAnimationFrame(animate)
}

watch(() => props.active, () => {
  cancelAnimationFrame(animationId)
  animate()
}, { flush: 'post' })
watch([() => player.spectrumSettings, color], draw, { deep: true, flush: 'post' })
useResizeObserver(canvas, draw)
onMounted(animate)
onBeforeUnmount(() => cancelAnimationFrame(animationId))
</script>

<template>
  <canvas ref="canvas" class="block w-full h-full" aria-hidden="true" />
</template>

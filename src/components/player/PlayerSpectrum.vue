<script setup lang="ts">
import { getAudioPlayer } from '@/utils/player'

const props = defineProps<{
  active: boolean
}>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const animationId = ref(0)

function draw() {
  if (!canvas.value || !props.active)
    return

  const ctx = canvas.value.getContext('2d')
  if (!ctx)
    return

  const player = getAudioPlayer()
  const data = player.getFrequencyData()
  if (!data) {
    animationId.value = requestAnimationFrame(draw)
    return
  }

  const width = canvas.value.width
  const height = canvas.value.height
  ctx.clearRect(0, 0, width, height)

  // 取前 64 根频率柱（低频到中频更有视觉表现力）
  const barCount = 64
  const gap = 2
  const barWidth = (width - gap * (barCount - 1)) / barCount

  for (let i = 0; i < barCount; i++) {
    const value = data[i] / 255
    const barHeight = Math.max(2, value * height)
    const x = i * (barWidth + gap)
    const y = height - barHeight

    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + value * 0.4})`
    ctx.beginPath()
    // 圆角顶部
    const radius = Math.min(barWidth / 2, 0)
    // const radius = 0
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + barWidth - radius, y)
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius)
    ctx.lineTo(x + barWidth, height)
    ctx.lineTo(x, height)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.fill()
  }

  animationId.value = requestAnimationFrame(draw)
}

function setupCanvas() {
  if (!canvas.value)
    return
  const rect = canvas.value.getBoundingClientRect()
  canvas.value.width = rect.width * window.devicePixelRatio
  canvas.value.height = rect.height * window.devicePixelRatio
  const ctx = canvas.value.getContext('2d')
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    canvas.value.width = rect.width
    canvas.value.height = rect.height
  }
}

watch(() => props.active, (active) => {
  if (active) {
    nextTick(() => {
      setupCanvas()
      draw()
    })
  }
  else {
    cancelAnimationFrame(animationId.value)
  }
})

onMounted(() => {
  if (props.active) {
    setupCanvas()
    draw()
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId.value)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="w-full h-full"
  />
</template>

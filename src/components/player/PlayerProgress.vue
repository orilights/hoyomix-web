<script setup lang="ts">
import { usePlayerStore } from '@/store/player'
import { formatDuration } from '@/utils'

const props = withDefaults(defineProps<{
  currentTime: number
  duration: number
  bufferedEnd: number
  thin?: boolean
}>(), {
  thin: false,
})

const emit = defineEmits<{
  seek: [time: number]
}>()

const player = usePlayerStore()
const { isFullscreen } = storeToRefs(player)

const progressBar = useTemplateRef<HTMLElement>('progressBar')
const isDragging = ref(false)
const hoverTime = ref(-1)
const dragTime = ref(-1)

const progressPercent = computed(() => {
  if (!props.duration)
    return 0
  return (props.currentTime / props.duration) * 100
})

const bufferedPercent = computed(() => {
  if (!props.duration)
    return 0
  return (props.bufferedEnd / props.duration) * 100
})

const displayTime = computed(() => {
  if (isDragging.value && dragTime.value >= 0)
    return dragTime.value
  if (hoverTime.value >= 0)
    return hoverTime.value
  return -1
})

function getTimeFromEvent(e: MouseEvent | Touch) {
  if (!progressBar.value || !props.duration)
    return 0
  const rect = progressBar.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  return (x / rect.width) * props.duration
}

function onMouseDown(e: MouseEvent) {
  if (!props.duration)
    return
  isDragging.value = true
  dragTime.value = getTimeFromEvent(e)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    dragTime.value = getTimeFromEvent(e)
  }
}

function onMouseUp() {
  if (isDragging.value && dragTime.value >= 0) {
    emit('seek', dragTime.value)
  }
  isDragging.value = false
  dragTime.value = -1
  hoverTime.value = -1
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function onMouseEnter(e: MouseEvent) {
  if (!isDragging.value) {
    hoverTime.value = getTimeFromEvent(e)
  }
}

function onMouseMoveBar(e: MouseEvent) {
  if (!isDragging.value) {
    hoverTime.value = getTimeFromEvent(e)
  }
}

function onMouseLeave() {
  if (!isDragging.value) {
    hoverTime.value = -1
  }
}

function onClick(e: MouseEvent) {
  if (!props.duration)
    return
  emit('seek', getTimeFromEvent(e))
}

function onTouchStart(e: TouchEvent) {
  if (!props.duration || !e.touches.length)
    return
  isDragging.value = true
  dragTime.value = getTimeFromEvent(e.touches[0])
}

function onTouchMove(e: TouchEvent) {
  if (isDragging.value && e.touches.length) {
    e.preventDefault()
    dragTime.value = getTimeFromEvent(e.touches[0])
  }
}

function onTouchEnd() {
  if (isDragging.value && dragTime.value >= 0) {
    emit('seek', dragTime.value)
  }
  isDragging.value = false
  dragTime.value = -1
}

const displayPercent = computed(() => {
  if (isDragging.value && dragTime.value >= 0 && props.duration) {
    return (dragTime.value / props.duration) * 100
  }
  return progressPercent.value
})

const hoverPercent = computed(() => {
  if (hoverTime.value >= 0 && props.duration) {
    return (hoverTime.value / props.duration) * 100
  }
  return -1
})
</script>

<template>
  <div
    ref="progressBar"
    class="relative select-none cursor-pointer group"
    :class="{
      'h-1 hover:h-2 transition-[height] thin-hitbox': thin,
      'h-1.5': !thin,
      'h-2!': isDragging,
    }"
    @mousedown="onMouseDown"
    @mouseenter="onMouseEnter"
    @mousemove="onMouseMoveBar"
    @mouseleave="onMouseLeave"
    @click.prevent="onClick"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div
      class="absolute inset-0 overflow-hidden bg-white/10"
      :class="{
        'rounded-full': !thin,
        'rounded-r-full': thin,
        'bg-gray-500!': thin && !isFullscreen,
      }"
    >
      <div
        class="absolute inset-y-0 left-0 bg-white/10 transition-[width] duration-300"
        :class="thin ? 'rounded-r-full' : 'rounded-full'"
        :style="{ width: `${bufferedPercent}%` }"
      />
      <div
        class="absolute inset-y-0 left-0 bg-white/80"
        :class="thin ? 'rounded-r-full' : 'rounded-full'"
        :style="{ width: `${displayPercent}%` }"
      />
    </div>

    <div
      v-if="!thin || isDragging"
      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity z-100"
      :class="{ '!opacity-100': isDragging }"
      :style="{ left: `${displayPercent}%` }"
    />

    <div
      v-if="displayTime >= 0 "
      class="absolute -top-8 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none"
      :style="{ left: `${isDragging ? displayPercent : (hoverPercent >= 0 ? hoverPercent : displayPercent)}%` }"
    >
      {{ formatDuration(Math.floor(displayTime)) }}
    </div>
  </div>
</template>

<style scoped>
.thin-hitbox::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -12px;
  bottom: -12px;
}
</style>

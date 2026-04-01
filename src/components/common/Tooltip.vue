<script setup lang="ts">
type Placement = 'top' | 'bottom' | 'left' | 'right'
type Align = 'start' | 'center' | 'end'

const props = withDefaults(defineProps<{
  placement?: Placement
  align?: Align
  content?: string
  theme?: 'dark' | 'light'
}>(), {
  placement: 'right',
  align: 'start',
  theme: 'dark',
})

const show = ref(false)

function onTouchStart() {
  show.value = !show.value
  if (show.value) {
    document.addEventListener('touchstart', hideTooltip, { once: true, capture: true })
  }
}

function hideTooltip() {
  show.value = false
}

function onMouseEnter() {
  show.value = true
}

function onMouseLeave() {
  show.value = false
}

const tooltipStyle = computed(() => {
  const { placement, align } = props
  const style: Record<string, string> = {}
  const gap = '6px'

  if (placement === 'right') {
    style.left = `calc(100% + ${gap})`
    if (align === 'center') {
      style.top = '50%'
      style.transform = 'translateY(-50%)'
    }
    else if (align === 'end') {
      style.bottom = '0'
    }
    else {
      style.top = '0'
    }
  }
  else if (placement === 'left') {
    style.right = `calc(100% + ${gap})`
    if (align === 'center') {
      style.top = '50%'
      style.transform = 'translateY(-50%)'
    }
    else if (align === 'end') {
      style.bottom = '0'
    }
    else {
      style.top = '0'
    }
  }
  else if (placement === 'top') {
    style.bottom = `calc(100% + ${gap})`
    if (align === 'center') {
      style.left = '50%'
      style.transform = 'translateX(-50%)'
    }
    else if (align === 'end') {
      style.right = '0'
    }
    else {
      style.left = '0'
    }
  }
  else {
    style.top = `calc(100% + ${gap})`
    if (align === 'center') {
      style.left = '50%'
      style.transform = 'translateX(-50%)'
    }
    else if (align === 'end') {
      style.right = '0'
    }
    else {
      style.left = '0'
    }
  }

  return style
})
</script>

<template>
  <div class="relative">
    <div @mouseenter="onMouseEnter" @mouseleave="onMouseLeave" @touchstart="onTouchStart">
      <slot />
    </div>
    <Transition name="tooltip">
      <div
        v-if="show"
        class="absolute z-100 pointer-events-none"
        :style="tooltipStyle"
      >
        <slot name="tooltip">
          <div
            v-if="content" class="px-2 py-1 text-xs rounded-md shadow whitespace-nowrap"
            :class="{
              'bg-gray-800 text-white': theme === 'dark',
              'bg-white text-gray-800': theme === 'light',
            }"
          >
            {{ content }}
          </div>
        </slot>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}
</style>

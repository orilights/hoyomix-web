<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { computed, ref } from 'vue'

type PlacementProp = 'top' | 'bottom' | 'left' | 'right'
type Align = 'start' | 'center' | 'end'

const props = withDefaults(defineProps<{
  placement?: PlacementProp
  align?: Align
  content?: string
  theme?: 'dark' | 'light'
}>(), {
  placement: 'right',
  align: 'start',
  theme: 'dark',
})

const show = ref(false)

const reference = useTemplateRef<HTMLElement>('reference')
const floating = useTemplateRef<HTMLElement>('floating')

const floatingPlacement = computed<Placement>(() => {
  const base = props.placement
  if (props.align === 'start')
    return `${base}-start` as Placement
  if (props.align === 'end')
    return `${base}-end` as Placement
  return base
})

const { floatingStyles } = useFloating(reference, floating, {
  placement: floatingPlacement,
  middleware: [offset(6), flip(), shift({ padding: 8 })],
  strategy: 'fixed',
  open: show,
  whileElementsMounted: autoUpdate,
})

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
</script>

<template>
  <div ref="reference" class="relative" v-bind="$attrs">
    <div @mouseenter="onMouseEnter" @mouseleave="onMouseLeave" @touchstart="onTouchStart">
      <slot />
    </div>
  </div>

  <Teleport to="body">
    <Transition name="tooltip">
      <div
        v-if="show"
        ref="floating"
        class="z-[1002] pointer-events-none max-w-[calc(100vw-16px)]"
        :style="floatingStyles"
      >
        <slot name="tooltip">
          <div
            v-if="content" class="px-2 py-1 text-xs rounded-md shadow break-words"
            :class="{
              'bg-gray-800 text-white': theme === 'dark',
              'bg-white text-gray-800 dark:bg-[var(--theme-surface)] dark:text-gray-100': theme === 'light',
            }"
          >
            {{ content }}
          </div>
        </slot>
      </div>
    </Transition>
  </Teleport>
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

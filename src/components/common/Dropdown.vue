<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { computed, onBeforeUnmount, ref } from 'vue'

interface DropdownOption {
  label: string
  desc?: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  options: DropdownOption[]
  alignment?: 'left' | 'center' | 'right'
  position?: 'down' | 'up' | 'auto'
  dark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  alignment: 'left',
  position: 'auto',
  dark: false,
})

const container = useTemplateRef<HTMLElement>('container')
const menu = useTemplateRef<HTMLElement>('menu')

const isOpen = ref(false)

const floatingPlacement = computed<Placement>(() => {
  const base = props.position === 'up' ? 'top' : 'bottom'
  if (props.alignment === 'left')
    return `${base}-start` as Placement
  if (props.alignment === 'right')
    return `${base}-end` as Placement
  return base
})

const middleware = computed(() => [
  offset(6),
  ...(props.position === 'auto' ? [flip()] : []),
  shift({ padding: 8 }),
])

const { floatingStyles } = useFloating(container, menu, {
  placement: floatingPlacement,
  middleware,
  strategy: 'fixed',
  open: isOpen,
  whileElementsMounted: autoUpdate,
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    document.addEventListener('click', handleOutsideClick, true)
  }
  else {
    document.removeEventListener('click', handleOutsideClick, true)
  }
}

function handleOutsideClick(event: MouseEvent) {
  const path = event.composedPath()
  if ((container.value && path.includes(container.value)) || (menu.value && path.includes(menu.value)))
    return
  closeDropdown()
}

function closeDropdown() {
  isOpen.value = false
  document.removeEventListener('click', handleOutsideClick, true)
}

function selectOption(option: DropdownOption) {
  if (option.disabled)
    return
  option.onClick()
  closeDropdown()
}

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick, true)
})
</script>

<template>
  <div ref="container" class="relative inline-block" v-bind="$attrs">
    <div class="dropdown-trigger" @click.stop="toggleDropdown">
      <slot />
    </div>
  </div>

  <Teleport to="body">
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        ref="menu"
        class="dropdown-menu rounded-lg w-fit text-sm shadow overflow-hidden z-999"
        :class="dark ? 'bg-gray-800 text-white' : 'bg-white'"
        :style="floatingStyles"
        @click.stop
      >
        <div
          v-for="(option, index) in options"
          :key="index"
          class="p-2 transition-colors text-nowrap"
          :class="option.disabled
            ? dark ? 'text-white/30 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
            : dark ? 'cursor-pointer hover:bg-white/10' : 'cursor-pointer hover:bg-gray-500/10'"
          @click="selectOption(option)"
        >
          {{ option.label }}
          <span v-if="option.desc" class="text-xs text-gray-500">{{ option.desc }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
}
</style>

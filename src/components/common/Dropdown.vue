<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'

interface DropdownOption {
  label: string
  onClick: () => void
}

interface Props {
  options: DropdownOption[]
  alignment?: 'left' | 'center' | 'right'
  autoPosition?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  alignment: 'left',
  autoPosition: true,
})

const container = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)

const isOpen = ref(false)
const menuDirection = ref('down')

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      calculatePosition()
      document.addEventListener('click', closeDropdown)
    })
  }
  else {
    document.removeEventListener('click', closeDropdown)
  }
}

function closeDropdown() {
  isOpen.value = false
  document.removeEventListener('click', closeDropdown)
}

function calculatePosition() {
  if (!props.autoPosition) {
    menuDirection.value = 'down'
    return
  }

  if (!container.value || !menu.value)
    return

  const triggerRect = container.value.getBoundingClientRect()
  const menuHeight = menu.value.offsetHeight
  const spaceBelow = window.innerHeight - triggerRect.bottom

  if (spaceBelow < menuHeight && triggerRect.top > menuHeight) {
    menuDirection.value = 'up'
  }
  else {
    menuDirection.value = 'down'
  }
}

function selectOption(option: DropdownOption) {
  option.onClick()
  isOpen.value = false
  document.removeEventListener('click', closeDropdown)
}

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div ref="container" class="relative inline-block">
    <div class="dropdown-trigger" @click.stop="toggleDropdown">
      <slot />
    </div>

    <transition name="dropdown">
      <div
        v-show="isOpen"
        ref="menu"
        class="dropdown-menu absolute left-0 mt-1 bg-white rounded-lg w-fit text-sm shadow overflow-hidden z-999"
        :class="[`align-${alignment}`, { 'menu-up': menuDirection === 'up' }]"
        @click.stop
      >
        <div
          v-for="(option, index) in options"
          :key="index"
          class="p-2 cursor-pointer hover:bg-gray-500/10 transition-colors text-nowrap"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.dropdown-menu.align-left {
  left: 0;
  right: auto;
}

.dropdown-menu.align-center {
  left: 50%;
  transform: translateX(-50%);
}

.dropdown-menu.align-right {
  left: auto;
  right: 0;
}

.dropdown-menu.menu-up {
  bottom: 100%;
  top: auto;
  margin-top: 0;
  margin-bottom: 4px;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-enter-from.menu-up,
.dropdown-leave-to.menu-up {
  transform: translateY(10px);
}

.dropdown-enter-from.align-center,
.dropdown-leave-to.align-center {
  transform: translate(-50%, -10px);
}

.dropdown-enter-from.align-center.menu-up,
.dropdown-leave-to.align-center.menu-up {
  transform: translate(-50%, 10px);
}
</style>

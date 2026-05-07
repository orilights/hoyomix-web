<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  size?: 'sm' | 'md'
  hideHeaderBorder?: boolean
}>(), {
  size: 'sm',
  hideHeaderBorder: false,
})

const visible = defineModel<boolean>({ required: true })

function close() {
  visible.value = false
}

const mousedownOnOverlay = ref(false)

function onOverlayMousedown(e: MouseEvent) {
  mousedownOnOverlay.value = e.target === e.currentTarget
}

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget && mousedownOnOverlay.value)
    close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value)
    close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        @mousedown="onOverlayMousedown"
        @click="onOverlayClick"
      >
        <div
          class="w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
          :class="size === 'md' ? 'max-w-md' : 'max-w-sm'"
        >
          <div class="flex items-center justify-between px-6 py-4" :class="[hideHeaderBorder ? '' : 'border-b border-gray-100']">
            <h2 class="text-lg font-semibold text-gray-900">
              <slot name="title">
                {{ title }}
              </slot>
            </h2>
            <button
              class="p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              @click="close"
            >
              <LucideX class="size-4" />
            </button>
          </div>
          <slot />
          <div v-if="$slots.footer" class="border-t border-gray-100">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { t } from '@/i18n'
import { dialogStack, removeDialog } from '@/utils/dialog-stack'

const props = withDefaults(defineProps<{
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideHeaderBorder?: boolean
  closeOnClickOverlay?: boolean
}>(), {
  size: 'sm',
  hideHeaderBorder: false,
  closeOnClickOverlay: true,
})

const visible = defineModel<boolean>({ required: true })

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-[800px]',
}

const dialogId = Symbol('dialog')
const titleId = useId()
const panel = ref<HTMLElement | null>(null)
const isTopDialog = computed(() => dialogStack.value.at(-1) === dialogId)
const stackIndex = computed(() => dialogStack.value.indexOf(dialogId))
let returnFocus: HTMLElement | null = null

watch(visible, async (value) => {
  if (value) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogStack.value = [...dialogStack.value, dialogId]
    await nextTick()
    if (visible.value && isTopDialog.value)
      panel.value?.focus()
  }
  else {
    const wasTop = isTopDialog.value
    removeDialog(dialogId)
    await nextTick()
    if (wasTop && returnFocus?.isConnected && !returnFocus.closest('[inert]'))
      returnFocus.focus()
  }
}, { immediate: true, flush: 'sync' })

function close() {
  visible.value = false
}

const mousedownOnOverlay = ref(false)

function onOverlayMousedown(e: MouseEvent) {
  mousedownOnOverlay.value = e.target === e.currentTarget
}

function onOverlayClick(e: MouseEvent) {
  if (props.closeOnClickOverlay && e.target === e.currentTarget && mousedownOnOverlay.value)
    close()
}

function onKeydown(e: KeyboardEvent) {
  if (!visible.value || !isTopDialog.value)
    return
  if (e.key === 'Tab') {
    const elements = [...(panel.value?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])]
      .filter(element => element.getClientRects().length && !element.closest('[inert]'))
    const first = elements[0]
    const last = elements.at(-1)
    if (!first) {
      e.preventDefault()
      panel.value?.focus()
    }
    else if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
      e.preventDefault()
      last?.focus()
    }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel.value)) {
      e.preventDefault()
      first.focus()
    }
  }
  if (e.key === 'Escape' && visible.value && isTopDialog.value) {
    e.preventDefault()
    e.stopImmediatePropagation()
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  removeDialog(dialogId)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        :style="{ zIndex: 1000 + Math.max(0, stackIndex) }"
        :inert="!isTopDialog"
        @mousedown="onOverlayMousedown"
        @click="onOverlayClick"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="outline-none w-full bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-2xl overflow-hidden"
          :class="sizeClasses[size]"
        >
          <div class="flex items-center justify-between px-6 py-4" :class="[hideHeaderBorder ? '' : 'border-b border-gray-100 dark:border-gray-700']">
            <h2 :id="titleId" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              <slot name="title">
                {{ title }}
              </slot>
            </h2>
            <AppButton
              icon-only
              size="sm"
              shape="pill"
              variant="ghost"
              class="text-gray-400 hover:text-gray-600 hover:dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800"
              :aria-label="t('AppDialog.close_dialog')"
              @click="close"
            >
              <LucideX class="size-4" />
            </AppButton>
          </div>
          <slot />
          <div v-if="$slots.footer" class="border-t border-gray-100 dark:border-gray-700">
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

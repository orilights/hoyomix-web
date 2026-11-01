<script setup lang="ts">
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { t } from '@/i18n'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue: string | number
  options: readonly SelectOption[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  ariaLabelledby?: string
}>(), { disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const menu = useTemplateRef<HTMLElement>('menu')
const listId = useId()
const open = ref(false)
const activeIndex = ref(-1)
const selected = computed(() => props.options.find(option => option.value === props.modelValue))
const activeId = computed(() => open.value && activeIndex.value >= 0 ? `${listId}-${activeIndex.value}` : undefined)
const { floatingStyles, isPositioned } = useFloating(trigger, menu, {
  open,
  placement: 'bottom-start',
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
  middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 }), size({
    padding: 8,
    apply({ rects, availableWidth, availableHeight, elements }) {
      Object.assign(elements.floating.style, {
        minWidth: `${Math.min(rects.reference.width, Math.max(0, availableWidth))}px`,
        maxWidth: `${Math.max(0, availableWidth)}px`,
        maxHeight: `${Math.min(288, Math.max(0, availableHeight))}px`,
      })
    },
  })],
})

let typed = ''
let typeTimer: ReturnType<typeof setTimeout> | undefined
function close() {
  open.value = false
  typed = ''
  clearTimeout(typeTimer)
}
async function show(last = false) {
  if (props.disabled)
    return
  const selectedIndex = props.options.findIndex(option => option.value === props.modelValue && !option.disabled)
  activeIndex.value = selectedIndex >= 0
    ? selectedIndex
    : last
      ? props.options.reduce((lastIndex, option, index) => option.disabled ? lastIndex : index, -1)
      : props.options.findIndex(option => !option.disabled)
  open.value = true
  await nextTick()
  scrollActive()
}
function scrollActive() {
  menu.value?.querySelector<HTMLElement>(`[id="${listId}-${activeIndex.value}"]`)?.scrollIntoView({ block: 'nearest' })
}
function move(direction: number) {
  const length = props.options.length
  for (let step = 1; step <= length; step++) {
    const index = ((activeIndex.value + direction * step) % length + length) % length
    if (props.options[index] && !props.options[index].disabled) {
      activeIndex.value = index
      void nextTick(scrollActive)
      return
    }
  }
}
function choose(index: number) {
  const option = props.options[index]
  if (!option || option.disabled)
    return
  emit('update:modelValue', option.value)
  close()
  trigger.value?.focus({ preventScroll: true })
}
function onKeydown(event: KeyboardEvent) {
  if (props.disabled || event.isComposing)
    return
  if (event.key === 'Tab') {
    close()
    return
  }
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    event.stopPropagation()
    if (!open.value) {
      void show(event.key === 'ArrowUp' || event.key === 'End')
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      move(event.key === 'ArrowDown' ? 1 : -1)
    }
    else if (event.key === 'Home' || event.key === 'End') {
      activeIndex.value = event.key === 'Home' ? -1 : 0
      move(event.key === 'Home' ? 1 : -1)
    }
    else {
      choose(activeIndex.value)
    }
    return
  }
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    event.stopPropagation()
    if (!open.value)
      void show()
    typed += event.key.toLocaleLowerCase()
    clearTimeout(typeTimer)
    typeTimer = setTimeout(() => {
      typed = ''
    }, 600)
    const index = props.options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(typed))
    if (index >= 0) {
      activeIndex.value = index
      void nextTick(scrollActive)
    }
  }
}
function onOutside(event: Event) {
  const path = event.composedPath()
  if (!path.includes(trigger.value!) && !path.includes(menu.value!))
    close()
}
watch(() => [props.modelValue, props.options, props.disabled], () => close())
onMounted(() => {
  document.addEventListener('pointerdown', onOutside, true)
  document.addEventListener('focusin', onOutside, true)
})
onBeforeUnmount(() => {
  clearTimeout(typeTimer)
  document.removeEventListener('pointerdown', onOutside, true)
  document.removeEventListener('focusin', onOutside, true)
})
</script>

<template>
  <button
    v-bind="$attrs"
    ref="trigger"
    type="button"
    role="combobox"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    aria-haspopup="listbox"
    :aria-controls="open ? listId : undefined"
    :aria-expanded="open"
    :aria-activedescendant="activeId"
    class="inline-flex h-9 min-w-0 items-center justify-between gap-3 rounded-lg bg-black/5 dark:bg-white/5 px-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-black/10 hover:dark:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
    @click="open ? close() : show()"
    @keydown="onKeydown"
  >
    <span class="truncate">{{ selected?.label ?? placeholder ?? t('AppSelect.please_select') }}</span>
    <LucideChevronDown
      class="size-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform"
      :class="{ 'rotate-180': open }"
      aria-hidden="true"
    />
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      :id="listId"
      ref="menu"
      role="listbox"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      class="z-[1001] w-max rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-gray-100 p-1 shadow-xl text-sm overflow-y-auto overscroll-contain"
      :style="[floatingStyles, { visibility: isPositioned ? 'visible' : 'hidden' }]"
      @pointerdown.prevent
    >
      <div
        v-for="(option, index) in options"
        :id="`${listId}-${index}`"
        :key="option.value"
        role="option"
        :aria-selected="option.value === modelValue"
        :aria-disabled="option.disabled || undefined"
        class="flex items-center justify-between gap-3 rounded-lg px-3 py-2 break-words transition-colors"
        :class="option.disabled ? 'opacity-40 cursor-not-allowed' : [
          index === activeIndex ? 'bg-blue-500/10' : 'hover:bg-black/5 hover:dark:bg-white/5',
          option.value === modelValue ? 'text-blue-600 dark:text-blue-400' : '',
          'cursor-pointer',
        ]"
        @pointermove="!option.disabled && (activeIndex = index)"
        @click="choose(index)"
      >
        <span class="min-w-0">{{ option.label }}</span>
        <LucideCheck v-if="option.value === modelValue" class="size-4 shrink-0" aria-hidden="true" />
        <span v-else class="size-4 shrink-0" />
      </div>
      <p v-if="!options.length" class="px-3 py-2 text-gray-400">
        {{ t('AppSelect.no_options') }}
      </p>
    </div>
  </Teleport>
</template>

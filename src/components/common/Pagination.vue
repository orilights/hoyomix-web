<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  totalPages: number
  disabled?: boolean
  size?: 'xs' | 'sm'
  ariaLabel?: string
  noun?: string
}>(), { disabled: false, size: 'sm', ariaLabel: '分页', noun: '' })

const emit = defineEmits<{ 'update:modelValue': [page: number] }>()
type PageItem = number | 'previous-gap' | 'next-gap'
const items = computed<PageItem[]>(() => {
  const total = props.totalPages
  const current = Math.min(total, Math.max(1, props.modelValue))
  const range = (start: number, count: number) => Array.from({ length: count }, (_, index) => start + index)
  if (total <= 7)
    return range(1, Math.max(0, total))
  if (current <= 4)
    return [...range(1, 5), 'next-gap', total]
  if (current >= total - 3)
    return [1, 'previous-gap', ...range(total - 4, 5)]
  return [1, 'previous-gap', current - 1, current, current + 1, 'next-gap', total]
})

function jumpTarget(item: PageItem) {
  return typeof item === 'number' ? item : Math.min(props.totalPages, Math.max(1, props.modelValue + (item === 'previous-gap' ? -5 : 5)))
}

function select(page: number) {
  if (!props.disabled && page >= 1 && page <= props.totalPages && page !== props.modelValue)
    emit('update:modelValue', page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="flex max-w-full items-center gap-1 overflow-x-auto" :aria-label="ariaLabel">
    <AppButton icon-only :size="size" variant="ghost" class="shrink-0" :aria-label="`上一页${noun}`" :disabled="disabled || modelValue <= 1" @click="select(modelValue - 1)">
      <LucideChevronLeft class="size-4" />
    </AppButton>
    <AppButton
      v-for="item in items"
      :key="item"
      :size="size"
      class="shrink-0 max-sm:!px-1"
      :class="size === 'xs' ? 'min-w-5' : 'min-w-7'"
      :variant="item === modelValue ? 'primary' : 'ghost'"
      :aria-current="item === modelValue ? 'page' : undefined"
      :aria-label="typeof item === 'number' ? `第 ${item} 页${noun}` : `跳转至第 ${jumpTarget(item)} 页${noun}`"
      :title="typeof item === 'number' ? undefined : `跳转至第 ${jumpTarget(item)} 页${noun}`"
      :disabled="disabled"
      @click="select(jumpTarget(item))"
    >
      {{ typeof item === 'number' ? item : '…' }}
    </AppButton>
    <AppButton icon-only :size="size" variant="ghost" class="shrink-0" :aria-label="`下一页${noun}`" :disabled="disabled || modelValue >= totalPages" @click="select(modelValue + 1)">
      <LucideChevronRight class="size-4" />
    </AppButton>
  </nav>
</template>

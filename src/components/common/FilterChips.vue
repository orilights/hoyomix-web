<script setup lang="ts" generic="T extends string | number | null | undefined">
withDefaults(defineProps<{
  modelValue: T
  options: { value: T, label: string, count?: number, title?: string }[]
  scroll?: boolean
}>(), {
  scroll: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div class="flex items-center" :class="scroll ? 'flex-nowrap gap-1.5 overflow-x-auto' : 'flex-wrap gap-2'">
    <button
      v-for="option in options"
      :key="option.value ?? option.label"
      type="button"
      :title="option.title"
      :aria-pressed="modelValue === option.value"
      class="inline-flex items-center gap-2 max-w-full min-w-0 px-3 py-1 rounded-lg transition-colors cursor-pointer text-sm"
      :class="[
        scroll ? 'shrink-0 whitespace-nowrap' : '',
        modelValue === option.value ? 'bg-blue-500/90 text-white' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10',
      ]"
      @click="emit('update:modelValue', option.value)"
    >
      <span class="truncate">{{ option.label }}</span>
      <span v-if="option.count !== undefined" class="shrink-0 text-xs" :class="modelValue === option.value ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'">{{ option.count }}</span>
    </button>
  </div>
</template>

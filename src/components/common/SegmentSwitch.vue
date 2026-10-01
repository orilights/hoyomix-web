<script setup lang="ts">
interface Option {
  key: string
  label: string
}

defineProps<{
  options: Option[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
    <button
      v-for="opt in options"
      :key="opt.key"
      class="px-5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
      :class="modelValue === opt.key ? 'bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:dark:text-gray-300'"
      @click="emit('update:modelValue', opt.key)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

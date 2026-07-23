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
  <div class="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
    <button
      v-for="opt in options"
      :key="opt.key"
      class="px-5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
      :class="modelValue === opt.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      @click="emit('update:modelValue', opt.key)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

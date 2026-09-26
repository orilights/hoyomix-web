<script setup lang="ts">
export interface RadioOption {
  value: string | number
  label: string
  description?: string
  detail?: string
  disabled?: boolean
}

defineProps<{
  options: RadioOption[]
  modelValue: string | number
  name?: string
  ariaLabel?: string
  ariaLabelledby?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const groupId = useId()
</script>

<template>
  <div class="flex flex-wrap gap-4" role="radiogroup" :aria-label="ariaLabel" :aria-labelledby="ariaLabelledby">
    <label
      v-for="option in options"
      :key="option.value"
      class="flex items-start gap-2 py-2 text-sm leading-5 text-gray-700 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-500 has-[:focus-visible]:outline-offset-2"
      :class="option.disabled ? 'opacity-50 cursor-not-allowed' : ''"
    >
      <input
        type="radio"
        class="size-5 shrink-0 accent-blue-500"
        :name="name ?? groupId"
        :value="option.value"
        :checked="modelValue === option.value"
        :disabled="option.disabled"
        @change="emit('update:modelValue', option.value)"
      >
      <span class="min-w-0">
        <span class="font-medium">{{ option.label }}</span>
        <span v-if="option.description" class="block text-gray-500 mt-1">{{ option.description }}</span>
        <span v-if="option.detail" class="block text-xs text-gray-500 mt-1">{{ option.detail }}</span>
      </span>
    </label>
  </div>
</template>

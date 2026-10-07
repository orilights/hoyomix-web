<script setup lang="ts" generic="T extends string">
interface Option {
  key: T
  label: string
}

withDefaults(defineProps<{
  options: Option[]
  modelValue: T
  block?: boolean
}>(), {
  block: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div class="flex gap-1 bg-black/5 dark:bg-white/5 dark:ring-1 dark:ring-inset dark:ring-white/10 rounded-xl p-1" :class="block ? 'w-full flex-nowrap' : 'w-fit flex-wrap'">
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      :aria-pressed="modelValue === opt.key"
      class="py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
      :class="[
        block ? 'flex-1 basis-0 min-w-0 px-2' : 'px-5',
        modelValue === opt.key ? 'bg-white dark:bg-blue-500/90 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:dark:text-gray-300',
      ]"
      @click="emit('update:modelValue', opt.key)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

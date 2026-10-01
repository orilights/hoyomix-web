<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="flex items-center justify-between pb-4">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-gray-500 dark:text-gray-400 text-sm mt-1">
        {{ subtitle }}
      </p>
    </div>
    <slot name="extra" />
  </div>
</template>

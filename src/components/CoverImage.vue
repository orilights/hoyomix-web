<script setup lang="ts">
defineProps<{
  src: string
}>()

const loaded = ref(false)
const failed = ref(false)
</script>

<template>
  <div class="relative w-full pt-[100%] bg-gray-200 dark:bg-gray-700">
    <img
      v-if="!failed"
      class="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      :src="src"
      loading="lazy"
      @load="loaded = true"
      @error="failed = true"
    >
    <div
      v-else
      class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-400"
    >
      <LucideCloudAlert class="size-8" />
    </div>
  </div>
</template>

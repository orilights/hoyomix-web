<script setup lang="ts">
defineProps<{
  src: string
}>()

const loaded = ref(false)
</script>

<template>
  <div class="relative w-full pt-[100%] bg-gray-200">
    <img
      class="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      :src="src"
      loading="lazy"
      @load="loaded = true"
    >
  </div>
</template>

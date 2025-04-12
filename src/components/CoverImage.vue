<script setup lang="ts">
defineProps<{
  src: string
}>()
</script>

<template>
  <div class="relative w-full pt-[100%] bg-gray-200">
    <img
      class="absolute top-0 left-0 w-full h-full object-cover"
      :src="src"
      loading="lazy"
    >
  </div>
</template>

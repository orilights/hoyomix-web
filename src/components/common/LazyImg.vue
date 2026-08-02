<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const loaded = ref(false)
const attrs = useAttrs()
const wrapperClass = computed(() => attrs.class)
const imgAttrs = computed(() => {
  const { class: _c, ...rest } = attrs
  return rest
})
</script>

<template>
  <span class="inline-block bg-gray-200 overflow-hidden shrink-0 leading-none" :class="wrapperClass">
    <img
      v-bind="imgAttrs"
      loading="lazy"
      class="size-full object-cover transition-opacity duration-300"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      @load="loaded = true"
    >
  </span>
</template>

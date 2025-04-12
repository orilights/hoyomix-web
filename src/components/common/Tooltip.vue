<script setup lang="ts">
const tooltip = ref<HTMLElement>()

const width = ref(0)
const show = ref(false)

onMounted(() => {
  width.value = tooltip.value!.offsetWidth
})
</script>

<template>
  <div ref="tooltip" class="relative">
    <div @mouseenter="show = true" @mouseleave="show = false">
      <slot />
    </div>
    <Transition name="tooltip">
      <div
        v-if="show"
        class="absolute top-0 z-100 w-[1000px] pointer-events-none" :style="{
          left: '100%',
        }"
      >
        <slot name="tooltip" />
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}
</style>

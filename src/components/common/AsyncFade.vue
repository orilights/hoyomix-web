<template>
  <Transition name="async-fade" mode="out-in" appear>
    <slot />
  </Transition>
</template>

<style scoped>
.async-fade-enter-active {
  transition: opacity 0.5s ease;
}

.async-fade-enter-from {
  opacity: 0;
}
</style>

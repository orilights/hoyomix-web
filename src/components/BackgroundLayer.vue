<script setup lang="ts">
import { useMainStore } from '@/store/main'

const store = useMainStore()
const { backgroundUrl } = storeToRefs(store)

const background1 = useTemplateRef<HTMLElement>('background1')
const background2 = useTemplateRef<HTMLElement>('background2')
const showBackground = ref(1)

let loadId = 0

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
    if (img.complete)
      resolve()
  })
}

watch(backgroundUrl, (newVal) => {
  if (!newVal) {
    showBackground.value = 0
    return
  }

  const currentLoadId = ++loadId

  preloadImage(newVal).then(() => {
    if (currentLoadId !== loadId)
      return

    if (showBackground.value === 1) {
      background2.value!.style.setProperty('--background-image', `url(${newVal})`)
      showBackground.value = 2
    }
    else {
      background1.value!.style.setProperty('--background-image', `url(${newVal})`)
      showBackground.value = 1
    }
  })
})
</script>

<template>
  <div
    ref="background1"
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500 blur-2xl" :class="{
      'opacity-0': showBackground !== 1,
      'opacity-100': showBackground === 1,
    }"
  />
  <div
    ref="background2"
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500 blur-2xl" :class="{
      'opacity-0': showBackground !== 2,
      'opacity-100': showBackground === 2,
    }"
  />
  <div class="fixed inset-0 pointer-events-none bg-white/85" />
</template>

<style scoped>
.page-background {
  background-image: var(--background-image);
  background-size: cover;
  background-position: center;
}
</style>

<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core'
import { LucideLayoutGrid, LucideSlidersHorizontal } from 'lucide-vue-next'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'

const store = useStore()
const playerStore = usePlayerStore()
const { backgroundUrl } = storeToRefs(store)
const { isFullscreen } = storeToRefs(playerStore)

const background1 = ref<HTMLElement | null>(null)
const background2 = ref<HTMLElement | null>(null)

const showBackground = ref(1)

const { y: scrollY } = useWindowScroll()

watch(backgroundUrl, async (newVal) => {
  if (newVal) {
    if (showBackground.value === 1) {
      background2.value!.style.setProperty('--background-image', `url(${newVal})`)
      showBackground.value = 2
    }
    else {
      background1.value!.style.setProperty('--background-image', `url(${newVal})`)
      showBackground.value = 1
    }
  }
  else {
    showBackground.value = 0
  }
})
</script>

<template>
  <div
    ref="background1"
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500 blur-md" :class="{
      'opacity-0': showBackground !== 1,
      'opacity-100': showBackground === 1,
    }"
  />
  <div
    ref="background2"
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500 blur-md" :class="{
      'opacity-0': showBackground !== 2,
      'opacity-100': showBackground === 2,
    }"
  />
  <div
    class="fixed left-0 right-0 top-0 z-10 px-4 md:px-16 xl:px-32 py-2 backdrop-blur-md transition-all duration-500" :class="{
      'bg-slate-50/60': scrollY > 0,
      '-translate-y-full opacity-0 pointer-events-none': isFullscreen,
    }"
  >
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-full hover:bg-gray-500/20 transition-colors cursor-pointer"
      @click="$router.back()"
    >
      <LucideChevronLeft class="size-4.5" />
    </button>
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-full hover:bg-gray-500/20 transition-colors cursor-pointer ml-2"
      @click="$router.push({ name: 'Home' })"
    >
      <LucideLayoutGrid class="size-4.5" />
    </button>
    <button
      class="text-sm bg-gray-500/10 p-2 rounded-full hover:bg-gray-500/20 transition-colors cursor-pointer ml-2"
      @click="$router.push({ name: 'Settings' })"
    >
      <LucideSlidersHorizontal class="size-4.5" />
    </button>
  </div>
  <div class="default-layout min-h-screen backdrop-blur-2xl bg-white/80">
    <div class="px-4 md:px-16 xl:px-32 pt-[80px] pb-[100px]">
      <slot />
    </div>
  </div>

  <PlayerPlaylist />
  <PlayerBar />
  <PlayerFullscreen />
</template>

<style scoped>
.page-background {
  background-image: var(--background-image);
  background-size: cover;
  background-position: center;
}
</style>

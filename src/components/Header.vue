<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'

const { y: scrollY } = useWindowScroll()
const store = useStore()
const player = usePlayerStore()
const { isFullscreen } = storeToRefs(player)
const { showSearch } = storeToRefs(store)

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="fixed left-0 right-0 top-0 z-10 px-4 md:px-16 xl:px-32 py-2 backdrop-blur-md transition-all duration-500 flex items-center" :class="{
      'bg-slate-50/60': scrollY > 0,
      '-translate-y-full opacity-0 pointer-events-none': isFullscreen,
    }"
  >
    <div class="flex items-center">
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
    <div class="ml-auto flex items-center gap-2">
      <button
        class="text-sm bg-gray-500/10 p-2 rounded-full hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
        @click="showSearch = true"
      >
        <LucideSearch class="size-4.5" />
        <kbd class="hidden md:inline text-xs text-gray-400">Ctrl+K</kbd>
      </button>
      <UserButton />
    </div>
  </div>
  <SearchModal v-model="showSearch" />
</template>

<style scoped>

</style>

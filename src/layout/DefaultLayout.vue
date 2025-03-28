<script setup lang="ts">
import { useStore } from '@/store'

const route = useRoute()
const store = useStore()
const { backgroundUrl } = toRefs(store)

const background1 = ref<HTMLElement | null>(null)
const background2 = ref<HTMLElement | null>(null)

const showBackground = ref(1)
const showCopyright = computed(() => !(route.meta?.hideCopyright === true))

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
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500" :class="{
      'opacity-0': showBackground !== 1,
      'opacity-100': showBackground === 1,
    }"
  />
  <div
    ref="background2"
    class="page-background w-screen h-screen fixed pointer-events-none transition-opacity duration-500" :class="{
      'opacity-0': showBackground !== 2,
      'opacity-100': showBackground === 2,
    }"
  />
  <div class="default-layout min-h-screen backdrop-blur-2xl bg-white/80">
    <div class="px-4 lg:px-32 py-8">
      <div class="pb-4">
        <button
          class="text-sm bg-gray-500/10 p-3 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
          @click="$router.back()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          class="text-sm bg-gray-500/10 p-3 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer ml-2"
          @click="$router.push({ name: 'Home' })"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
            <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          class="text-sm bg-gray-500/10 p-3 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer ml-2"
          @click="$router.push({ name: 'Settings' })"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
            <path fill-rule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <slot />
      <div v-if="showCopyright" class="mt-8 text-sm text-gray-500">
        <div class="absolute bottom-0 text-center w-full left-0 mb-4">
          本网站由爱好者制作，并非 HOYO-MiX 官方网站。
          网站内使用的图标、专辑图片、文本，仅用于信息展示，其版权属于 米哈游/miHoYo/上海米哈游网络科技股份有限公司。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-background {
  background-image: var(--background-image);
  background-size: cover;
  background-position: center;
}
</style>

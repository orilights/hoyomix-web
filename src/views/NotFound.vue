<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { useMainStore } from '@/store/main'

const route = useRoute()
const router = useRouter()
const store = useMainStore()

const errorMessage = computed(() => route.query.errorMessage as string | undefined)

usePageSeo({
  title: '页面不存在',
  description: '你访问的页面或内容可能不存在',
  noindex: true,
})

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] text-center">
    <div class="text-8xl font-bold text-gray-300 mb-4">
      404
    </div>
    <div class="text-xl mb-2 text-gray-500">
      {{ errorMessage || '资源不存在' }}
    </div>
    <div class="text-sm text-gray-400 mb-8">
      你访问的页面或内容可能不存在
    </div>
    <button
      class="px-6 py-2.5 bg-black/10 hover:bg-black/20 rounded-lg transition-colors cursor-pointer text-sm"
      @click="router.replace('/')"
    >
      返回首页
    </button>
  </div>
</template>

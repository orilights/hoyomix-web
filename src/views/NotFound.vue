<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { useMainStore } from '@/store/main'

const route = useRoute()
const router = useRouter()
const store = useMainStore()

const errorMessage = computed(() => route.query.errorMessage as string | undefined)

usePageSeo({
  title: () => t('NotFound.page_not_found'),
  description: () => t('NotFound.the_page_or_content_you_requested_may_not_exist'),
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
    <div class="text-xl mb-2 text-gray-500 dark:text-gray-400">
      {{ errorMessage || t('fetch.resource_not_found') }}
    </div>
    <div class="text-sm text-gray-400 mb-8">
      {{ t('NotFound.the_page_or_content_you_requested_may_not_exist') }}
    </div>
    <AppButton
      variant="ghost" size="lg"
      @click="router.replace('/')"
    >
      {{ t('Header.go_to_home') }}
    </AppButton>
  </div>
</template>

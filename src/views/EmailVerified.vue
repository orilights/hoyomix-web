<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

const auth = useAuthStore()
const store = useMainStore()

usePageSeo({
  title: () => t('EmailVerified.email_verified'),
  description: () => t('EmailVerified.email_verified'),
  noindex: true,
})

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] py-16">
    <div class="w-full max-w-md bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 px-8 py-10">
      <div class="flex flex-col items-center gap-4">
        <div class="size-16 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
          <LucideMailCheck class="size-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ t('EmailVerified.email_verified') }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          {{ t('EmailVerified.your_email_has_been_verified_you_can_now_sign') }}
        </p>
        <AppButton
          variant="primary" size="lg" class="mt-2"
          @click="auth.openAuthDialog()"
        >
          {{ t('EmailVerified.sign_in_now') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

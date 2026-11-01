<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useLocalizedText } from '@/composables/useLocalizedText'
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { authClient } from '@/utils/auth-client'

const route = useRoute()
const auth = useAuthStore()
const store = useMainStore()

usePageSeo({
  title: () => t('ResetPassword.reset_password'),
  description: () => t('ResetPassword.reset_password'),
  noindex: true,
})

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const errorParam = computed(() => (typeof route.query.error === 'string' ? route.query.error : ''))

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = useLocalizedText()
const success = ref(false)

const isInvalidToken = computed(() => !token.value || !!errorParam.value)

function getErrorMessage(error: { status?: number, message?: string, code?: string } | null): string {
  if (!error)
    return t('ResetPassword.failed_to_reset_password_please_try_again_later')
  if (error.message)
    return error.message
  const codeMessages: Record<string, string> = {
    get INVALID_TOKEN() {
      return t('ResetPassword.the_reset_link_is_invalid_or_has_expired')
    },
    get TOKEN_EXPIRED() {
      return t('ResetPassword.the_reset_link_has_expired_request_a_new_one')
    },
    get PASSWORD_TOO_SHORT() {
      return t('ResetPassword.password_is_too_short')
    },
    get PASSWORD_TOO_LONG() {
      return t('ResetPassword.password_is_too_long')
    },
    get TOO_MANY_REQUESTS() {
      return t('auth_error.too_many_requests_please_try_again_later')
    },
  }
  if (error.code && codeMessages[error.code])
    return codeMessages[error.code]
  const statusMessages: Record<number, string> = {
    get 400() {
      return t('ResetPassword.the_reset_link_is_invalid_or_has_expired')
    },
    get 422() {
      return t('ResetPassword.password_does_not_meet_the_requirements')
    },
    get 429() {
      return t('auth_error.too_many_requests_please_try_again_later')
    },
  }
  if (error.status && statusMessages[error.status])
    return statusMessages[error.status]
  return error.message ?? t('ResetPassword.failed_to_reset_password_please_try_again_later')
}

onMounted(() => {
  store.setBackground()
})

async function handleSubmit() {
  errorMsg.value = ''
  if (newPassword.value.length < 8) {
    errorMsg.value = () => t('ResetPassword.password_must_contain_at_least_8_characters')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = () => t('ResetPassword.passwords_do_not_match')
    return
  }
  loading.value = true
  const { error } = await authClient.resetPassword({
    newPassword: newPassword.value,
    token: token.value,
  })
  loading.value = false
  if (error) {
    errorMsg.value = () => getErrorMessage(error)
    return
  }
  success.value = true
  toast.success(t('ResetPassword.password_reset_successfully'))
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] py-16">
    <div class="w-full max-w-md bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 px-8 py-10">
      <div v-if="isInvalidToken" class="flex flex-col items-center gap-4">
        <div class="size-16 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
          <LucideTriangleAlert class="size-8 text-red-500" />
        </div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ t('ResetPassword.invalid_reset_link') }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          {{ t('ResetPassword.the_reset_link_is_invalid_or_has_expired_request') }}
        </p>
        <AppButton
          variant="primary" size="lg" class="mt-2"
          @click="auth.openAuthDialog()"
        >
          {{ t('ResetPassword.go_to_sign_in') }}
        </AppButton>
      </div>

      <div v-else-if="success" class="flex flex-col items-center gap-4">
        <div class="size-16 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
          <LucideCircleCheck class="size-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ t('ResetPassword.password_reset_successfully') }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          {{ t('ResetPassword.your_password_has_been_updated_sign_in_with_your') }}
        </p>
        <AppButton
          variant="primary" size="lg" class="mt-2"
          @click="auth.openAuthDialog()"
        >
          {{ t('EmailVerified.sign_in_now') }}
        </AppButton>
      </div>

      <form v-else class="space-y-3" @submit.prevent="handleSubmit">
        <div class="flex flex-col items-center gap-2 mb-4">
          <div class="size-14 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
            <LucideKeyRound class="size-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ t('ResetPassword.set_a_new_password') }}
          </h1>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ResetPassword.new_password') }}</label>
          <input
            v-model="newPassword"
            type="password"
            required
            autocomplete="new-password"
            :placeholder="t('ResetPassword.at_least_8_characters')"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ResetPassword.confirm_new_password') }}</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            :placeholder="t('ResetPassword.enter_your_new_password_again')"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
          >
        </div>
        <p v-if="errorMsg" class="text-sm text-red-500">
          {{ errorMsg }}
        </p>
        <AppButton
          type="submit"
          variant="primary"
          class="w-full mt-2"
          :disabled="loading"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <LucideLoader2 class="size-4 animate-spin" />{{ t('SongCreditsEditDialog.submitting') }}</span>
          <span v-else>{{ t('ResetPassword.confirm_reset') }}</span>
        </AppButton>
      </form>
    </div>
  </div>
</template>

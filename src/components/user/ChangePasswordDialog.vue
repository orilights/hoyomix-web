<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useLocalizedText } from '@/composables/useLocalizedText'
import { t } from '@/i18n'
import { authClient } from '@/utils/auth-client'

const visible = defineModel<boolean>({ required: true })

const loading = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMsg = useLocalizedText()

function resetForm() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  errorMsg.value = ''
}

function close() {
  visible.value = false
  resetForm()
}

watch(visible, (val) => {
  if (!val)
    resetForm()
})

async function handleSubmit() {
  errorMsg.value = ''
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = () => t('ChangePasswordDialog.new_passwords_do_not_match')
    return
  }
  loading.value = true
  const { error } = await authClient.changePassword({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    revokeOtherSessions: true,
  })
  loading.value = false
  if (error) {
    const statusMessages: Record<number, string> = {
      get 400() {
        return t('ChangePasswordDialog.incorrect_current_password')
      },
      get 401() {
        return t('ChangePasswordDialog.incorrect_current_password')
      },
    }
    errorMsg.value = () => error.message || (error.status && statusMessages[error.status]) || t('ChangePasswordDialog.failed_to_change_password')
    return
  }
  toast.success(t('ChangePasswordDialog.password_changed_other_devices_have_been_signed_out'))
  close()
}
</script>

<template>
  <AppDialog v-model="visible" :close-on-click-overlay="false" :title="t('Settings.change_password')">
    <form class="px-6 py-5 space-y-3" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ChangePasswordDialog.current_password') }}</label>
        <input
          v-model="currentPassword"
          type="password"
          required
          autocomplete="current-password"
          :placeholder="t('ChangePasswordDialog.enter_your_current_password')"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
        >
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
        <span v-else>{{ t('ChangePasswordDialog.confirm_changes') }}</span>
      </AppButton>
    </form>
  </AppDialog>
</template>

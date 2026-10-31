<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useLocalizedText } from '@/composables/useLocalizedText'
import { useUserNameValidation } from '@/composables/useUserNameValidation'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { authClient } from '@/utils/auth-client'
import { getAuthErrorMessage } from '@/utils/auth-error'

const visible = defineModel<boolean>({ required: true })

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const loading = ref(false)
const name = ref('')
const errorMsg = useLocalizedText()
let formRevision = 0

const nameId = useId()
const originalName = computed(() => user.value?.name)
const { message: nameMessage, error: nameError, checking, unchanged, confirmAvailable, setServerError } = useUserNameValidation(name, visible, originalName)

function resetForm() {
  name.value = user.value?.name ?? ''
  errorMsg.value = ''
}

function close() {
  visible.value = false
  resetForm()
}

watch([visible, () => user.value?.id], ([val]) => {
  formRevision++
  if (val)
    name.value = user.value?.name ?? ''
  else
    errorMsg.value = ''
}, { flush: 'sync' })

async function handleSubmit() {
  if (loading.value)
    return
  errorMsg.value = ''
  if (unchanged.value) {
    close()
    return
  }
  loading.value = true
  const submittedName = name.value
  const userId = user.value?.id
  const revision = formRevision
  try {
    if (!await confirmAvailable() || !userId || user.value?.id !== userId)
      return
    const { error } = await authClient.updateUser({ name: submittedName })
    if (revision !== formRevision || !visible.value || user.value?.id !== userId || name.value !== submittedName)
      return
    if (error) {
      if (error.code === 'USERNAME_TAKEN' || error.code === 'INVALID_USERNAME')
        setServerError(() => getAuthErrorMessage(error))
      else
        errorMsg.value = () => getAuthErrorMessage(error)
      return
    }
    await auth.refreshSession()
    if (revision !== formRevision || !visible.value || user.value?.id !== userId)
      return
    toast.success(t('ChangeUsernameDialog.username_changed'))
    close()
  }
  catch {
    if (revision === formRevision && visible.value && user.value?.id === userId)
      errorMsg.value = () => t('ChangeUsernameDialog.failed_to_change_username_check_your_connection_and_try')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" :close-on-click-overlay="false" :title="t('Settings.change_username')">
    <form class="px-6 py-5 space-y-3" @submit.prevent="handleSubmit">
      <div>
        <label :for="nameId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('AuthDialog.username') }}</label>
        <input
          :id="nameId"
          v-model="name"
          type="text"
          :required="!unchanged"
          :disabled="loading"
          autocomplete="username"
          :aria-invalid="!!nameError"
          :aria-describedby="`${nameId}-hint`"
          :placeholder="t('ChangeUsernameDialog.enter_your_new_username')"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
        >
        <AsyncFade>
          <p v-if="nameMessage" :id="`${nameId}-hint`" :key="nameMessage" class="mt-1 text-xs" :class="nameError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'" aria-live="polite" :aria-busy="checking">
            {{ nameMessage }}
          </p>
        </AsyncFade>
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

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { usePageSeo } from '@/composables/usePageSeo'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { authClient } from '@/utils/auth-client'

const route = useRoute()
const auth = useAuthStore()
const store = useMainStore()

usePageSeo({
  title: '重置密码',
  description: '重置密码',
  noindex: true,
})

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const errorParam = computed(() => (typeof route.query.error === 'string' ? route.query.error : ''))

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const success = ref(false)

const isInvalidToken = computed(() => !token.value || !!errorParam.value)

function getErrorMessage(error: { status?: number, message?: string, code?: string } | null): string {
  if (!error)
    return '重置密码失败，请稍后重试'
  const codeMessages: Record<string, string> = {
    INVALID_TOKEN: '重置链接无效或已过期',
    TOKEN_EXPIRED: '重置链接已过期，请重新获取',
    PASSWORD_TOO_SHORT: '密码长度不足',
    PASSWORD_TOO_LONG: '密码长度过长',
    TOO_MANY_REQUESTS: '请求过于频繁，请稍后重试',
  }
  if (error.code && codeMessages[error.code])
    return codeMessages[error.code]
  const statusMessages: Record<number, string> = {
    400: '重置链接无效或已过期',
    422: '密码不符合要求',
    429: '请求过于频繁，请稍后重试',
  }
  if (error.status && statusMessages[error.status])
    return statusMessages[error.status]
  return error.message ?? '重置密码失败，请稍后重试'
}

onMounted(() => {
  store.setBackground()
})

async function handleSubmit() {
  errorMsg.value = ''
  if (newPassword.value.length < 8) {
    errorMsg.value = '密码至少 8 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  const { error } = await authClient.resetPassword({
    newPassword: newPassword.value,
    token: token.value,
  })
  loading.value = false
  if (error) {
    errorMsg.value = getErrorMessage(error)
    return
  }
  success.value = true
  toast.success('密码重置成功')
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
          重置链接无效
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          重置链接无效或已过期，请重新获取密码重置邮件。
        </p>
        <AppButton
          variant="primary" size="lg" class="mt-2"
          @click="auth.openAuthDialog()"
        >
          前往登录
        </AppButton>
      </div>

      <div v-else-if="success" class="flex flex-col items-center gap-4">
        <div class="size-16 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
          <LucideCircleCheck class="size-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          密码重置成功
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          你的密码已更新，请使用新密码登录。
        </p>
        <AppButton
          variant="primary" size="lg" class="mt-2"
          @click="auth.openAuthDialog()"
        >
          立即登录
        </AppButton>
      </div>

      <form v-else class="space-y-3" @submit.prevent="handleSubmit">
        <div class="flex flex-col items-center gap-2 mb-4">
          <div class="size-14 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
            <LucideKeyRound class="size-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            设置新密码
          </h1>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
          <input
            v-model="newPassword"
            type="password"
            required
            autocomplete="new-password"
            placeholder="至少 8 位"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            placeholder="再次输入新密码"
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
            <LucideLoader2 class="size-4 animate-spin" />
            提交中...
          </span>
          <span v-else>确认重置</span>
        </AppButton>
      </form>
    </div>
  </div>
</template>

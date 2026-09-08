<script setup lang="ts">
import { toast } from 'vue-sonner'
import { authClient } from '@/utils/auth-client'

const visible = defineModel<boolean>({ required: true })

const loading = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')

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
    errorMsg.value = '两次输入的新密码不一致'
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
      400: '当前密码错误',
      401: '当前密码错误',
    }
    errorMsg.value = (error.status && statusMessages[error.status]) || error.message || '修改密码失败'
    return
  }
  toast.success('密码修改成功，其他设备已退出登录')
  close()
}
</script>

<template>
  <AppDialog v-model="visible" title="修改密码">
    <form class="px-6 py-5 space-y-3" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
        <input
          v-model="currentPassword"
          type="password"
          required
          autocomplete="current-password"
          placeholder="请输入当前密码"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 transition-colors"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
        <input
          v-model="newPassword"
          type="password"
          required
          autocomplete="new-password"
          placeholder="至少 8 位"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 transition-colors"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
        <input
          v-model="confirmPassword"
          type="password"
          required
          autocomplete="new-password"
          placeholder="再次输入新密码"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 transition-colors"
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
        <span v-else>确认修改</span>
      </AppButton>
    </form>
  </AppDialog>
</template>

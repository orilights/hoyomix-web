<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/store/auth'
import { authClient } from '@/utils/auth-client'

const visible = defineModel<boolean>({ required: true })

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const loading = ref(false)
const name = ref('')
const errorMsg = ref('')

const MAX_NAME_LENGTH = 30

function resetForm() {
  name.value = user.value?.name ?? ''
  errorMsg.value = ''
}

function close() {
  visible.value = false
  resetForm()
}

watch(visible, (val) => {
  if (val)
    name.value = user.value?.name ?? ''
  else
    errorMsg.value = ''
})

async function handleSubmit() {
  errorMsg.value = ''
  const trimmed = name.value.trim()
  if (!trimmed) {
    errorMsg.value = '用户名不能为空'
    return
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    errorMsg.value = `用户名长度不能超过 ${MAX_NAME_LENGTH} 个字符`
    return
  }
  if (trimmed === user.value?.name) {
    close()
    return
  }
  loading.value = true
  const { error } = await authClient.updateUser({ name: trimmed })
  loading.value = false
  if (error) {
    errorMsg.value = error.message || '修改用户名失败'
    return
  }
  await auth.refreshSession()
  toast.success('用户名修改成功')
  close()
}
</script>

<template>
  <AppDialog v-model="visible" title="修改用户名">
    <form class="px-6 py-5 space-y-3" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名</label>
        <input
          v-model="name"
          type="text"
          required
          autocomplete="name"
          placeholder="请输入新的用户名"
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
        <span v-else>确认修改</span>
      </AppButton>
    </form>
  </AppDialog>
</template>

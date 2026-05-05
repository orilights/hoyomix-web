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

const mousedownOnOverlay = ref(false)

function onOverlayMousedown(e: MouseEvent) {
  mousedownOnOverlay.value = e.target === e.currentTarget
}

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget && mousedownOnOverlay.value)
    close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value)
    close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="auth-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        @mousedown="onOverlayMousedown"
        @click="onOverlayClick"
      >
        <div class="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 class="text-xl font-bold">
              修改密码
            </h2>
            <button
              class="p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              @click="close"
            >
              <LucideX class="size-4" />
            </button>
          </div>

          <form class="px-6 pb-6 space-y-3" @submit.prevent="handleSubmit">
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
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <LucideLoader2 class="size-4 animate-spin" />
                提交中...
              </span>
              <span v-else>确认修改</span>
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity 0.2s ease;
}

.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useUserNameValidation } from '@/composables/useUserNameValidation'
import { authClient } from '@/utils/auth-client'
import { getAuthErrorMessage } from '@/utils/auth-error'

const router = useRouter()
const route = useRoute()

const visible = defineModel<boolean>({ required: true })

const tab = ref<'login' | 'register' | 'forgot'>('login')
const loading = ref(false)
const registerSuccess = ref(false)
const forgotSuccess = ref(false)

const showThirdPartyLogin = ref(false)

const loginEmail = ref('')
const loginPassword = ref('')

const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerConfirm = ref('')
const registerNameId = useId()
const registerNameEnabled = computed(() => visible.value && tab.value === 'register' && !registerSuccess.value)
const {
  message: registerNameMessage,
  error: registerNameError,
  checking: registerNameChecking,
  confirmAvailable: confirmRegisterName,
  setServerError: setRegisterNameError,
} = useUserNameValidation(registerName, registerNameEnabled)

const forgotEmail = ref('')

const errorMsg = ref('')
let formRevision = 0
watch([visible, tab], () => {
  formRevision++
}, { flush: 'sync' })

function resetForms() {
  loginEmail.value = ''
  loginPassword.value = ''
  registerName.value = ''
  registerEmail.value = ''
  registerPassword.value = ''
  registerConfirm.value = ''
  forgotEmail.value = ''
  errorMsg.value = ''
  registerSuccess.value = false
  forgotSuccess.value = false
}

function close() {
  visible.value = false
  tab.value = 'login'
  resetForms()
}

watch(visible, (val) => {
  if (!val)
    resetForms()
})

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  const { error } = await authClient.signIn.email({
    email: loginEmail.value,
    password: loginPassword.value,
  })
  loading.value = false
  if (error) {
    errorMsg.value = getAuthErrorMessage(error)
    return
  }
  close()
  toast.success('登录成功')
  if (route.name === 'EmailVerified')
    router.replace('/')
  else
    location.reload()
}

async function handleRegister() {
  if (loading.value)
    return
  errorMsg.value = ''
  if (registerPassword.value !== registerConfirm.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  const submittedName = registerName.value
  const revision = formRevision
  try {
    if (!await confirmRegisterName())
      return
    const { error } = await authClient.signUp.email({
      name: submittedName,
      email: registerEmail.value,
      password: registerPassword.value,
      callbackURL: `${window.location.origin}${router.resolve({ name: 'EmailVerified' }).href}`,
    })
    if (revision !== formRevision || !registerNameEnabled.value || registerName.value !== submittedName)
      return
    if (error) {
      if (error.code === 'USERNAME_TAKEN' || error.code === 'INVALID_USERNAME')
        setRegisterNameError(getAuthErrorMessage(error))
      else
        errorMsg.value = getAuthErrorMessage(error)
      return
    }
    registerSuccess.value = true
  }
  catch {
    if (revision === formRevision && registerNameEnabled.value)
      errorMsg.value = '注册失败，请检查网络后重试'
  }
  finally {
    loading.value = false
  }
}

async function handleForgot() {
  errorMsg.value = ''
  loading.value = true
  const { error } = await authClient.requestPasswordReset({
    email: forgotEmail.value,
    redirectTo: `${window.location.origin}${router.resolve({ name: 'ResetPassword' }).href}`,
  })
  loading.value = false
  if (error) {
    errorMsg.value = getAuthErrorMessage(error)
    return
  }
  forgotSuccess.value = true
}

function handleGitHub() {
  authClient.signIn.social({
    provider: 'github',
    callbackURL: window.location.href,
  })
}
</script>

<template>
  <AppDialog v-model="visible" :close-on-click-overlay="false" hide-header-border>
    <template #title>
      {{ registerSuccess ? '注册成功' : forgotSuccess ? '邮件已发送' : tab === 'login' ? '登录' : tab === 'register' ? '注册账号' : '重置密码' }}
    </template>

    <div v-if="registerSuccess" class="px-6 pb-8">
      <div class="flex flex-col items-center gap-4 py-2">
        <div class="size-14 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
          <LucideMailCheck class="size-7 text-green-600 dark:text-green-400" />
        </div>
        <div class="text-center">
          <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">
            验证邮件已发送至 <span class="font-medium text-gray-900 dark:text-gray-100">{{ registerEmail }}</span><br>
            请点击邮件中的链接完成验证后登录。
          </p>
          <p class="text-xs text-gray-400 mt-1">
            若未收到邮件，请检查垃圾邮件文件夹。
          </p>
        </div>
        <button
          class="text-sm text-blue-500 hover:text-blue-600 hover:dark:text-blue-400 cursor-pointer transition-colors"
          @click="tab = 'login'; registerSuccess = false"
        >
          前往登录
        </button>
      </div>
    </div>

    <div v-else-if="forgotSuccess" class="px-6 pb-8">
      <div class="flex flex-col items-center gap-4 py-2">
        <div class="size-14 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
          <LucideMailCheck class="size-7 text-green-600 dark:text-green-400" />
        </div>
        <div class="text-center">
          <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">
            重置邮件已发送至 <span class="font-medium text-gray-900 dark:text-gray-100">{{ forgotEmail }}</span><br>
            请点击邮件中的链接完成密码重置。
          </p>
          <p class="text-xs text-gray-400 mt-1">
            若未收到邮件，请检查垃圾邮件文件夹。
          </p>
        </div>
        <button
          class="text-sm text-blue-500 hover:text-blue-600 hover:dark:text-blue-400 cursor-pointer transition-colors"
          @click="tab = 'login'; forgotSuccess = false"
        >
          返回登录
        </button>
      </div>
    </div>

    <template v-else>
      <div v-if="tab !== 'forgot'" class="flex border-b border-gray-200 dark:border-gray-700 px-6">
        <button
          class="pb-3 mr-6 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="tab === 'login' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:dark:text-gray-300'"
          @click="tab = 'login'; errorMsg = ''"
        >
          登录
        </button>
        <button
          class="pb-3 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="tab === 'register' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:dark:text-gray-300'"
          @click="tab = 'register'; errorMsg = ''"
        >
          注册
        </button>
      </div>

      <div class="px-6 py-5">
        <form v-if="tab === 'login'" class="space-y-3" @submit.prevent="handleLogin">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
            <input
              v-model="loginEmail"
              type="email"
              required
              autocomplete="email"
              placeholder="请输入邮箱"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码</label>
            <input
              v-model="loginPassword"
              type="password"
              required
              autocomplete="current-password"
              placeholder="请输入密码"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
            >
          </div>
          <div class="flex justify-end -mt-1">
            <button
              type="button"
              class="text-xs text-blue-500 hover:text-blue-600 hover:dark:text-blue-400 cursor-pointer transition-colors"
              @click="tab = 'forgot'; errorMsg = ''"
            >
              忘记密码？
            </button>
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
              登录中...
            </span>
            <span v-else>登录</span>
          </AppButton>
        </form>

        <form v-else-if="tab === 'register'" class="space-y-3" @submit.prevent="handleRegister">
          <div>
            <label :for="registerNameId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名</label>
            <input
              :id="registerNameId"
              v-model="registerName"
              type="text"
              required
              :disabled="loading"
              autocomplete="username"
              :aria-invalid="!!registerNameError"
              :aria-describedby="`${registerNameId}-hint`"
              placeholder="请输入用户名"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
            >
            <p :id="`${registerNameId}-hint`" class="mt-1 text-xs" :class="registerNameError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'" aria-live="polite" :aria-busy="registerNameChecking">
              {{ registerNameMessage }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
            <input
              v-model="registerEmail"
              :disabled="loading"
              type="email"
              required
              autocomplete="email"
              placeholder="请输入登录邮箱"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码</label>
            <input
              v-model="registerPassword"
              :disabled="loading"
              type="password"
              required
              autocomplete="new-password"
              placeholder="至少 8 位"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认密码</label>
            <input
              v-model="registerConfirm"
              :disabled="loading"
              type="password"
              required
              autocomplete="new-password"
              placeholder="再次输入密码"
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
              注册中...
            </span>
            <span v-else>注册账号</span>
          </AppButton>
        </form>

        <form v-else class="space-y-3" @submit.prevent="handleForgot">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            输入注册邮箱，我们将发送一封密码重置邮件。
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
            <input
              v-model="forgotEmail"
              type="email"
              required
              autocomplete="email"
              placeholder="请输入注册邮箱"
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
              发送中...
            </span>
            <span v-else>发送重置邮件</span>
          </AppButton>
          <button
            type="button"
            class="w-full text-sm text-blue-500 hover:text-blue-600 hover:dark:text-blue-400 cursor-pointer transition-colors"
            @click="tab = 'login'; errorMsg = ''"
          >
            返回登录
          </button>
        </form>

        <div v-if="showThirdPartyLogin && tab !== 'forgot'" class="mt-4">
          <div class="relative flex items-center gap-2">
            <div class="flex-1 border-t border-gray-200 dark:border-gray-700" />
            <span class="text-xs text-gray-400 shrink-0">或</span>
            <div class="flex-1 border-t border-gray-200 dark:border-gray-700" />
          </div>
          <AppButton
            variant="outline"
            class="mt-3 w-full"
            @click="handleGitHub"
          >
            <IconGitHub class="size-4" />
            使用 GitHub 登录
          </AppButton>
        </div>
      </div>
    </template>
  </AppDialog>
</template>

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { authClient } from '@/utils/auth-client'

export const useAuthStore = defineStore('auth', () => {
  const session = authClient.useSession()

  const user = computed(() => session.value?.data?.user ?? null)
  const token = computed(() => session.value?.data?.session?.token ?? null)
  const isLoggedIn = computed(() => !!user.value)
  const isPending = computed(() => session.value?.isPending ?? true)

  const showAuthDialog = ref(false)

  function openAuthDialog() {
    showAuthDialog.value = true
  }

  function requireLogin(): boolean {
    if (isLoggedIn.value)
      return true
    toast.error('请先登录')
    openAuthDialog()
    return false
  }

  async function logout() {
    await authClient.signOut()
  }

  return { user, token, isLoggedIn, isPending, showAuthDialog, openAuthDialog, requireLogin, logout }
})

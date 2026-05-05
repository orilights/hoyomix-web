import { defineStore } from 'pinia'
import { computed } from 'vue'
import { authClient } from '@/utils/auth-client'

export const useAuthStore = defineStore('auth', () => {
  const session = authClient.useSession()

  const user = computed(() => session.value?.data?.user ?? null)
  const token = computed(() => session.value?.data?.session?.token ?? null)
  const isLoggedIn = computed(() => !!user.value)
  const isPending = computed(() => session.value?.isPending ?? true)

  async function logout() {
    await authClient.signOut()
  }

  return { user, token, isLoggedIn, isPending, logout }
})

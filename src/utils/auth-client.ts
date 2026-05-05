import { createAuthClient } from 'better-auth/vue'
import { userApiBase } from '@/constants'

export const authClient = createAuthClient({
  baseURL: userApiBase,
})

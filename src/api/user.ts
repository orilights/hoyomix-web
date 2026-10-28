import type { UserNameAvailability } from '@/types/user'
import { userApiBase } from '@/constants'
import { fetchJson } from '@/utils/fetch'

export function getUserNameAvailabilityApi(name: string) {
  return fetchJson<UserNameAvailability>(`${userApiBase}/api/users/name-availability?${new URLSearchParams({ name })}`, true, 'user-service')
}

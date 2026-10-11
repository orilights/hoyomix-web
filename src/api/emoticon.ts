import type { EmoticonGroup } from '@/types/emoticon'
import { userApiBase } from '@/constants'
import { fetchJson } from '@/utils/fetch'

export function getEmoticonsApi() {
  return fetchJson<EmoticonGroup[]>(`${userApiBase}/api/emoticons`, true, 'user-service')
}

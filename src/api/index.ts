import { apiBase } from '@/constants'

export function getIndexApi() {
  return fetch(`${apiBase}/merged.json`)
}

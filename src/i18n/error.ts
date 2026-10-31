import type { MessageKey } from './index'
import { t } from './index'

/** Frontend errors keep their key; server/native error messages remain untouched. */
export class LocalizedError extends Error {
  constructor(key: MessageKey, params: Record<string, unknown> = {}, plural?: number) {
    super()
    this.name = 'LocalizedError'
    Object.defineProperty(this, 'message', { configurable: true, get: () => t(key, params, plural) })
  }
}

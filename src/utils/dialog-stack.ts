import { shallowRef } from 'vue'

export const dialogStack = shallowRef<symbol[]>([])

export function removeDialog(id: symbol) {
  dialogStack.value = dialogStack.value.filter(value => value !== id)
}

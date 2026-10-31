type LocalizedText = string | (() => string)

/** Retain the message producer so visible validation errors follow language changes. */
export function useLocalizedText() {
  const source = shallowRef<LocalizedText>('')
  return computed({
    get: () => typeof source.value === 'function' ? source.value() : source.value,
    set: (value: LocalizedText) => { source.value = value },
  })
}

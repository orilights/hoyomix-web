import { refDebounced } from '@vueuse/core'
import { useUserNameAvailabilityQuery } from '@/composables/queries'
import { t } from '@/i18n'
import { getUserNameValidationError } from '@/utils/user-name'

export function useUserNameValidation(name: Ref<string>, enabled: Ref<boolean>, originalName: Ref<string | undefined> = ref(undefined)) {
  const attempted = ref(false)
  const serverError = shallowRef<{ name: string, message: string | (() => string) } | null>(null)
  const unchanged = computed(() => originalName.value !== undefined && name.value === originalName.value)
  const formatError = computed(() => unchanged.value ? null : getUserNameValidationError(name.value))
  const candidate = computed(() => enabled.value && !unchanged.value && !formatError.value ? name.value : null)
  const debounced = refDebounced(candidate, 350)
  const queryName = computed(() => candidate.value === debounced.value ? candidate.value : null)
  const query = useUserNameAvailabilityQuery(queryName)
  const result = computed(() => candidate.value && query.data.value?.name === candidate.value ? query.data.value : null)
  const checking = computed(() => candidate.value !== null && (queryName.value !== candidate.value || query.isFetching.value))
  const error = computed(() => {
    if (!enabled.value || unchanged.value || (!name.value && !attempted.value))
      return ''
    if (serverError.value?.name === name.value)
      return typeof serverError.value.message === 'function' ? serverError.value.message() : serverError.value.message
    if (formatError.value)
      return formatError.value
    if (result.value?.available === false)
      return t('useUserNameValidation.this_username_is_already_taken')
    if (!checking.value && query.isError.value)
      return t('useUserNameValidation.unable_to_check_username_availability_please_try_again')
    return ''
  })
  const message = computed(() => {
    if (!enabled.value || unchanged.value)
      return ''
    if (error.value)
      return error.value
    if (checking.value)
      return t('useUserNameValidation.checking_username')
    if (result.value?.available)
      return t('useUserNameValidation.username_is_available')
    return t('useUserNameValidation.232_characters_letters_in_any_language_numbers_and_underscores')
  })

  watch([name, enabled, originalName], () => {
    serverError.value = null
    attempted.value = false
  }, { flush: 'sync' })

  function setServerError(message: string | (() => string)) {
    serverError.value = { name: name.value, message }
  }

  async function confirmAvailable() {
    attempted.value = true
    serverError.value = null
    if (unchanged.value)
      return true
    if (formatError.value)
      return false
    const requested = name.value
    const original = originalName.value
    try {
      const response = await query.checkName(requested)
      if (!enabled.value || name.value !== requested || originalName.value !== original)
        return false
      if (!response.available) {
        setServerError(() => t('useUserNameValidation.this_username_is_already_taken'))
        return false
      }
      return true
    }
    catch {
      if (enabled.value && name.value === requested)
        setServerError(() => t('useUserNameValidation.unable_to_check_username_availability_please_try_again'))
      return false
    }
  }

  return { message, error, checking, unchanged, confirmAvailable, setServerError }
}

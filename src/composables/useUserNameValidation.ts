import { refDebounced } from '@vueuse/core'
import { useUserNameAvailabilityQuery } from '@/composables/queries'
import { getUserNameValidationError } from '@/utils/user-name'

export function useUserNameValidation(name: Ref<string>, enabled: Ref<boolean>, originalName: Ref<string | undefined> = ref(undefined)) {
  const attempted = ref(false)
  const serverError = ref<{ name: string, message: string } | null>(null)
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
      return serverError.value.message
    if (formatError.value)
      return formatError.value
    if (result.value?.available === false)
      return '用户名已被占用'
    if (!checking.value && query.isError.value)
      return '暂时无法检查用户名，请重试'
    return ''
  })
  const message = computed(() => {
    if (!enabled.value || unchanged.value)
      return ''
    if (error.value)
      return error.value
    if (checking.value)
      return '正在检查用户名…'
    if (result.value?.available)
      return '用户名可用'
    return '2～32 个字符，支持各语言文字、数字和下划线'
  })

  watch([name, enabled, originalName], () => {
    serverError.value = null
    attempted.value = false
  }, { flush: 'sync' })

  function setServerError(message: string) {
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
        setServerError('用户名已被占用')
        return false
      }
      return true
    }
    catch {
      if (enabled.value && name.value === requested)
        setServerError('暂时无法检查用户名，请重试')
      return false
    }
  }

  return { message, error, checking, unchanged, confirmAvailable, setServerError }
}

import { toast } from 'vue-sonner'
import { useMyEditRequestsQuery } from '@/composables/queries'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'

export function usePendingSongEditRequest(songId: Ref<number>, visible?: Ref<boolean>) {
  const auth = useAuthStore()
  const params = computed(() => ({ resourceType: 'song' as const, resourceId: songId.value, status: 'pending' as const, limit: 1 }))
  const { data, isPending, isFetching, isError, refetch } = useMyEditRequestsQuery(params, computed(() => songId.value > 0))
  const pendingRequest = computed(() => data.value?.items[0] ?? null)
  const checking = computed(() => auth.isPending || isPending.value || isFetching.value)
  const blocked = computed(() => !auth.isLoggedIn || checking.value || isError.value || !!pendingRequest.value)
  if (visible) {
    watch(visible, (value) => {
      if (value)
        void refetch()
    }, { flush: 'sync' })
    watch(() => [songId.value, auth.user?.id], () => {
      visible.value = false
    }, { flush: 'sync' })
  }
  async function checkBeforeSubmit() {
    if (!auth.isLoggedIn || blocked.value)
      return false
    const currentSongId = songId.value
    const userId = auth.user?.id
    const result = await refetch()
    if (songId.value !== currentSongId || auth.user?.id !== userId || (visible && !visible.value))
      return false
    if (result.isError) {
      toast.error(t('usePendingSongEditRequest.failed_to_load_request_status_please_try_again'))
      return false
    }
    if (result.data?.total) {
      toast.error(t('usePendingSongEditRequest.a_request_is_pending_review_view_or_cancel_it'))
      return false
    }
    return true
  }
  return { pendingRequest, checking, blocked, checkError: isError, retryCheck: refetch, checkBeforeSubmit }
}

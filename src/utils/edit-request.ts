import type { EditRequestStatus } from '@/types/edit-request'
import { t } from '@/i18n'

export const editRequestLabels: Record<EditRequestStatus, string> = { get pending() {
  return t('MusicActions.pending_review')
}, get approved() {
  return t('edit_request.approved')
}, get rejected() {
  return t('edit_request.rejected')
}, get cancelled() {
  return t('edit_request.cancelled')
} }
export const editRequestColors: Record<EditRequestStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
  cancelled: 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400',
}

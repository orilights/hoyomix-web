import type { EditRequestStatus } from '@/types/edit-request'

export const editRequestLabels: Record<EditRequestStatus, string> = { pending: '审核中', approved: '已通过', rejected: '已驳回', cancelled: '已取消' }
export const editRequestColors: Record<EditRequestStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
  cancelled: 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400',
}

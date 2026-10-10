export type EditRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type EditResourceType = 'album' | 'song' | 'artist'

export interface EditRequestItem {
  id: number
  resourceType: EditResourceType
  resourceId: number
  resourceName: string
  resourcePath: string | null
  status: EditRequestStatus
  summary: string
  reason: string
  createdAt: string
  updatedAt: string
}

export interface EditRequestDetail extends EditRequestItem {
  detail: string
}

export interface EditRequestList {
  total: number
  page: number
  limit: number
  items: EditRequestItem[]
}

export interface EditRequestParams {
  page?: number
  limit?: number
  status?: EditRequestStatus | 'pending,rejected'
  resourceType?: EditResourceType
  resourceId?: number
}

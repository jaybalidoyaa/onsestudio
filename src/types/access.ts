export type AccessRequestStatus = 'pending' | 'approved' | 'rejected'

export interface AccessRequest {
  id: string
  isBrigadaMember: boolean
  username: string
  email: string
  callsign: string
  status: AccessRequestStatus
  createdAt: number
  reviewedAt?: number
  reviewedBy?: string
  rejectionReason?: string
}

export const ACCESS_REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

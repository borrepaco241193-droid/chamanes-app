import api from '../lib/api'

export interface IdVerification {
  id: string
  firstName: string
  lastName: string
  email: string
  idPhotoUrl: string | null
  idVerified: boolean
  idVerificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  idVerificationNote: string | null
  updatedAt: string
}

export interface DashboardStats {
  units: { total: number; occupied: number; vacant: number }
  residents: number
  payments: { pending: number; collectedThisMonth: number }
  visitors: { activePasses: number; todayEvents: number }
  workOrders: { open: number; urgent: number }
  reservations: { pending: number; upcoming: number }
  staff: { onDuty: number }
}

export interface PaymentReportItem {
  month: string
  collected: number
  paidCount: number
  pendingCount: number
  totalCount: number
}

export interface AccessReportItem {
  date: string
  entries: number
  exits: number
  denied: number
}

export const adminService = {
  async getStats(communityId: string): Promise<DashboardStats> {
    const res = await api.get(`/communities/${communityId}/admin/stats`)
    return res.data
  },

  async getPaymentReport(communityId: string, months = 6): Promise<PaymentReportItem[]> {
    const res = await api.get(`/communities/${communityId}/admin/reports/payments`, {
      params: { months },
    })
    return res.data
  },

  async getAccessReport(communityId: string, days = 7): Promise<AccessReportItem[]> {
    const res = await api.get(`/communities/${communityId}/admin/reports/access`, {
      params: { days },
    })
    return res.data
  },

  async getPendingIdVerifications(communityId: string) {
    const res = await api.get(`/communities/${communityId}/admin/id-pending`)
    return res.data as { pending: IdVerification[] }
  },

  async getIdVerifications(communityId: string, status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL') {
    const res = await api.get(`/communities/${communityId}/admin/id-verifications`, { params: { status } })
    return res.data as { verifications: IdVerification[] }
  },

  async verifyId(communityId: string, userId: string, approve: boolean, note?: string) {
    const res = await api.patch(`/communities/${communityId}/admin/id-verify/${userId}`, { approve, note })
    return res.data
  },

  async getArrears(communityId: string): Promise<{ arrears: UnitArrear[]; total: number }> {
    const res = await api.get(`/communities/${communityId}/admin/arrears`)
    return res.data
  },

  async getAccessEvents(
    communityId: string,
    params?: { page?: number; limit?: number; type?: string; from?: string; to?: string },
  ) {
    const res = await api.get(`/communities/${communityId}/admin/access-events`, { params })
    return res.data as {
      events: AccessEvent[]
      total: number
      page: number
      pages: number
    }
  },
}

export interface UnitArrear {
  unitId: string
  unitNumber: string
  block: string | null
  floor: number | null
  resident: { firstName: string; lastName: string; email: string; phone: string | null } | null
  totalDebt: number
  pendingCount: number
  monthsOverdue: number
  oldestDueDate: string
  payments: { id: string; amount: number; description: string; dueDate: string; periodMonth: number | null; periodYear: number | null }[]
}

export interface AccessEvent {
  id: string
  communityId: string
  type: 'ENTRY' | 'EXIT'
  method: string
  personName: string
  personType: string
  plateNumber?: string
  isAllowed: boolean
  deniedReason?: string
  notes?: string
  createdAt: string
  visitorPass?: { visitorName: string } | null
}

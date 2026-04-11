import api from '../lib/api'

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
    return res.data as { pending: { id: string; firstName: string; lastName: string; email: string; idPhotoUrl: string }[] }
  },

  async verifyId(communityId: string, userId: string, approve: boolean) {
    const res = await api.patch(`/communities/${communityId}/admin/id-verify/${userId}`, { approve })
    return res.data
  },
}

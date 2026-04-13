import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

export function useCommunity() {
  const { activeCommunityId } = useAuthStore()
  return useQuery({
    queryKey: ['community', activeCommunityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${activeCommunityId}`)
      return data
    },
    enabled: !!activeCommunityId,
  })
}

export function useDashboardStats() {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['stats', ids],
    queryFn: async () => {
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/admin/stats`)
        return data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/admin/stats`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      if (results.length === 0) return {}
      // Aggregate numeric stats
      return results.reduce((acc, s) => ({
        totalResidents:    (acc.totalResidents    ?? 0) + (s.totalResidents    ?? 0),
        totalUnits:        (acc.totalUnits        ?? 0) + (s.totalUnits        ?? 0),
        pendingPayments:   (acc.pendingPayments   ?? 0) + (s.pendingPayments   ?? 0),
        pendingAmount:     (acc.pendingAmount     ?? 0) + (s.pendingAmount     ?? 0),
        monthRevenue:      (acc.monthRevenue      ?? 0) + (s.monthRevenue      ?? 0),
        openWorkOrders:    (acc.openWorkOrders    ?? 0) + (s.openWorkOrders    ?? 0),
        urgentWorkOrders:  (acc.urgentWorkOrders  ?? 0) + (s.urgentWorkOrders  ?? 0),
        upcomingReservations: (acc.upcomingReservations ?? 0) + (s.upcomingReservations ?? 0),
        todayAccess:       (acc.todayAccess       ?? 0) + (s.todayAccess       ?? 0),
      }), {})
    },
    enabled: ids.length > 0,
  })
}

export function usePaymentReport(months = 6) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['payment-report', ids, months],
    queryFn: async () => {
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/admin/reports/payments?months=${months}`)
        return data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/admin/reports/payments?months=${months}`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      // Merge by month key, sum amounts
      const merged = new Map<string, any>()
      results.forEach((report) => {
        const arr = Array.isArray(report) ? report : []
        arr.forEach((item: any) => {
          const key = item.month ?? item.date ?? item.period
          if (merged.has(key)) {
            merged.get(key).total = (merged.get(key).total ?? 0) + (item.total ?? 0)
          } else {
            merged.set(key, { ...item })
          }
        })
      })
      return Array.from(merged.values())
    },
    enabled: ids.length > 0,
  })
}

export function useAccessReport(days = 7) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['access-report', ids, days],
    queryFn: async () => {
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/admin/reports/access?days=${days}`)
        return data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/admin/reports/access?days=${days}`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = new Map<string, any>()
      results.forEach((report) => {
        const arr = Array.isArray(report) ? report : []
        arr.forEach((item: any) => {
          const key = item.date ?? item.day
          if (merged.has(key)) {
            merged.get(key).count = (merged.get(key).count ?? 0) + (item.count ?? 0)
          } else {
            merged.set(key, { ...item })
          }
        })
      })
      return Array.from(merged.values()).sort((a, b) =>
        (a.date ?? a.day ?? '').localeCompare(b.date ?? b.day ?? '')
      )
    },
    enabled: ids.length > 0,
  })
}

export function useAllCommunities() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['all-communities'],
    queryFn: async () => {
      const { data } = await api.get('/communities')
      return data.communities
    },
    enabled: user?.role === 'SUPER_ADMIN',
  })
}

export function useCreateCommunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: object) => api.post('/communities', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-communities'] }),
  })
}

export function useUpdateCommunity() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) =>
      api.patch(`/communities/${activeCommunityId}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', activeCommunityId] }),
  })
}

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
      // Aggregate — match exact nested structure the backend returns
      return results.reduce((acc: any, s: any) => ({
        residents: (acc.residents ?? 0) + (s.residents ?? 0),
        units: {
          total:    (acc.units?.total    ?? 0) + (s.units?.total    ?? 0),
          occupied: (acc.units?.occupied ?? 0) + (s.units?.occupied ?? 0),
          vacant:   (acc.units?.vacant   ?? 0) + (s.units?.vacant   ?? 0),
        },
        payments: {
          pending:             (acc.payments?.pending             ?? 0) + (s.payments?.pending             ?? 0),
          collectedThisMonth:  (acc.payments?.collectedThisMonth  ?? 0) + (s.payments?.collectedThisMonth  ?? 0),
          pendingAmount:       (acc.payments?.pendingAmount       ?? 0) + (s.payments?.pendingAmount       ?? 0),
        },
        visitors: {
          activePasses: (acc.visitors?.activePasses ?? 0) + (s.visitors?.activePasses ?? 0),
          todayEvents:  (acc.visitors?.todayEvents  ?? 0) + (s.visitors?.todayEvents  ?? 0),
        },
        workOrders: {
          open:   (acc.workOrders?.open   ?? 0) + (s.workOrders?.open   ?? 0),
          urgent: (acc.workOrders?.urgent ?? 0) + (s.workOrders?.urgent ?? 0),
        },
        reservations: {
          pending: (acc.reservations?.pending ?? 0) + (s.reservations?.pending ?? 0),
        },
        staff: {
          total: (acc.staff?.total ?? 0) + (s.staff?.total ?? 0),
        },
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

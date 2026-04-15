import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService, type DashboardStats } from '../services/admin.service'
import { useActiveCommunityIds, usePrimaryCommunityId } from './useActiveCommunityIds'

export function useDashboardStats() {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['admin-stats', ids],
    queryFn: async (): Promise<DashboardStats> => {
      if (ids.length <= 1) return adminService.getStats(ids[0] ?? '')
      const results = await Promise.allSettled(ids.map((id) => adminService.getStats(id)))
      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<DashboardStats> => r.status === 'fulfilled')
        .map((r) => r.value)
      // Sum all stats across communities
      return fulfilled.reduce((acc, s) => ({
        units: {
          total: acc.units.total + (s.units?.total ?? 0),
          occupied: acc.units.occupied + (s.units?.occupied ?? 0),
          vacant: acc.units.vacant + (s.units?.vacant ?? 0),
        },
        residents: acc.residents + (s.residents ?? 0),
        payments: {
          pending: acc.payments.pending + (s.payments?.pending ?? 0),
          collectedThisMonth: acc.payments.collectedThisMonth + (s.payments?.collectedThisMonth ?? 0),
        },
        visitors: {
          activePasses: acc.visitors.activePasses + (s.visitors?.activePasses ?? 0),
          todayEvents: acc.visitors.todayEvents + (s.visitors?.todayEvents ?? 0),
        },
        workOrders: {
          open: acc.workOrders.open + (s.workOrders?.open ?? 0),
          urgent: acc.workOrders.urgent + (s.workOrders?.urgent ?? 0),
        },
        staff: {
          onDuty: acc.staff.onDuty + (s.staff?.onDuty ?? 0),
        },
        reservations: {
          pending: acc.reservations.pending + (s.reservations?.pending ?? 0),
          upcoming: acc.reservations.upcoming + (s.reservations?.upcoming ?? 0),
        },
      }), {
        units: { total: 0, occupied: 0, vacant: 0 },
        residents: 0,
        payments: { pending: 0, collectedThisMonth: 0 },
        visitors: { activePasses: 0, todayEvents: 0 },
        workOrders: { open: 0, urgent: 0 },
        staff: { onDuty: 0 },
        reservations: { pending: 0, upcoming: 0 },
      })
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  })
}

export function usePaymentReport(months = 6) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['payment-report', ids, months],
    queryFn: async () => {
      if (ids.length <= 1) return adminService.getPaymentReport(ids[0] ?? '', months)
      const results = await Promise.allSettled(ids.map((id) => adminService.getPaymentReport(id, months)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      // Merge monthly arrays by month label
      const merged: Record<string, number> = {}
      fulfilled.forEach((r) => (r.data ?? r).forEach((p: any) => {
        merged[p.month] = (merged[p.month] ?? 0) + (p.total ?? 0)
      }))
      return Object.entries(merged).map(([month, total]) => ({ month, total }))
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  })
}

export function useAccessReport(days = 7) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['access-report', ids, days],
    queryFn: async () => {
      if (ids.length <= 1) return adminService.getAccessReport(ids[0] ?? '', days)
      const results = await Promise.allSettled(ids.map((id) => adminService.getAccessReport(id, days)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged: Record<string, number> = {}
      fulfilled.forEach((r) => (r.data ?? r).forEach((d: any) => {
        merged[d.date] = (merged[d.date] ?? 0) + (d.count ?? 0)
      }))
      return Object.entries(merged).map(([date, count]) => ({ date, count }))
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  })
}

export function usePendingIdVerifications() {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['id-pending', ids],
    queryFn: async () => {
      if (ids.length <= 1) return adminService.getPendingIdVerifications(ids[0] ?? '')
      const results = await Promise.allSettled(ids.map((id) => adminService.getPendingIdVerifications(id)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      return { pending: fulfilled.flatMap((r) => r.pending ?? []) }
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  })
}

export function useIdVerifications(status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL') {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['id-verifications', ids, status],
    queryFn: async () => {
      if (ids.length <= 1) return adminService.getIdVerifications(ids[0] ?? '', status)
      const results = await Promise.allSettled(ids.map((id) => adminService.getIdVerifications(id, status)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      return { verifications: fulfilled.flatMap((r) => r.verifications ?? []) }
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  })
}

export function useArrears() {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['arrears', ids],
    queryFn: async () => {
      if (ids.length <= 1) return adminService.getArrears(ids[0] ?? '')
      const results = await Promise.allSettled(ids.map((id) => adminService.getArrears(id)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = fulfilled.flatMap((r) => r.arrears ?? [])
      return { arrears: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  })
}

export function useAccessEvents(params?: { page?: number; type?: string; from?: string; to?: string }) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['access-events', ids, params],
    queryFn: async () => {
      if (ids.length <= 1) return adminService.getAccessEvents(ids[0] ?? '', params)
      const results = await Promise.allSettled(ids.map((id) => adminService.getAccessEvents(id, params)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = fulfilled.flatMap((r) => r.events ?? []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return { events: merged, total: merged.length, page: 1, limit: merged.length, pages: 1 }
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  })
}

export function useVerifyId() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, approve, note }: { userId: string; approve: boolean; note?: string }) =>
      adminService.verifyId(communityId, userId, approve, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['id-pending'] })
      queryClient.invalidateQueries({ queryKey: ['id-verifications'] })
    },
  })
}

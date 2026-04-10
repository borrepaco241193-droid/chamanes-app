import { useQuery } from '@tanstack/react-query'
import { adminService } from '../services/admin.service'
import { useAuthStore } from '../stores/auth.store'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function useDashboardStats() {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['admin-stats', communityId],
    queryFn: () => adminService.getStats(communityId),
    enabled: !!communityId,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000, // refresh every 2 min
  })
}

export function usePaymentReport(months = 6) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['payment-report', communityId, months],
    queryFn: () => adminService.getPaymentReport(communityId, months),
    enabled: !!communityId,
    staleTime: 5 * 60_000,
  })
}

export function useAccessReport(days = 7) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['access-report', communityId, days],
    queryFn: () => adminService.getAccessReport(communityId, days),
    enabled: !!communityId,
    staleTime: 5 * 60_000,
  })
}

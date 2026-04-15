import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentService, type PaymentStatus } from '../services/payment.service'
import { useActiveCommunityIds, usePrimaryCommunityId } from './useActiveCommunityIds'

export function usePayments(status?: PaymentStatus) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['payments', ids, status],
    queryFn: async () => {
      if (ids.length <= 1) return paymentService.list(ids[0] ?? '', { status })
      const results = await Promise.allSettled(ids.map((id) => paymentService.list(id, { status })))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const all = fulfilled.flatMap((r) => r.payments ?? [])
      const seen = new Set<string>()
      const merged = all.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
        .sort((a: any, b: any) => new Date(b.dueDate ?? b.createdAt).getTime() - new Date(a.dueDate ?? a.createdAt).getTime())
      return { payments: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  })
}

export function usePayment(paymentId: string) {
  const communityId = usePrimaryCommunityId()
  return useQuery({
    queryKey: ['payment', communityId, paymentId],
    queryFn: () => paymentService.get(communityId, paymentId),
    enabled: !!communityId && !!paymentId,
  })
}

export function useCheckout() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => paymentService.getCheckoutUrl(communityId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}

// Returns true if the resident has any overdue or pending payments
export function useHasPendingPayments() {
  const ids = useActiveCommunityIds()
  const { data, isLoading } = useQuery({
    queryKey: ['payments', ids, 'PENDING'],
    queryFn: async () => {
      if (ids.length <= 1) return paymentService.list(ids[0] ?? '', { status: 'PENDING' })
      const results = await Promise.allSettled(ids.map((id) => paymentService.list(id, { status: 'PENDING' })))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const all = fulfilled.flatMap((r) => r.payments ?? [])
      const seen = new Set<string>()
      const merged = all.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
      return { payments: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
  const hasPending = (data?.payments?.length ?? 0) > 0
  return { hasPending, isLoading }
}

export function usePaymentIntent() {
  const communityId = usePrimaryCommunityId()
  return useMutation({
    mutationFn: (paymentId: string) => paymentService.getPaymentIntent(communityId, paymentId),
  })
}

export function useGenerateFees() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { month: number; year: number; amount?: number }) =>
      paymentService.generateFees(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}

export function useCreateCharge() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      unitId: string; amount: number; description: string
      type?: 'MAINTENANCE_FEE' | 'FINE' | 'RESERVATION_FEE' | 'OTHER'; dueDate?: string
    }) => paymentService.createCharge(communityId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })
}

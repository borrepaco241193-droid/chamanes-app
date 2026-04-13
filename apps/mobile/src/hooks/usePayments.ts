import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentService, type PaymentStatus } from '../services/payment.service'
import { useAuthStore } from '../stores/auth.store'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function usePayments(status?: PaymentStatus) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['payments', communityId, status],
    queryFn: () => paymentService.list(communityId, { status }),
    enabled: !!communityId,
    staleTime: 30_000,
  })
}

export function usePayment(paymentId: string) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['payment', communityId, paymentId],
    queryFn: () => paymentService.get(communityId, paymentId),
    enabled: !!communityId && !!paymentId,
  })
}

export function useCheckout() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => paymentService.getCheckoutUrl(communityId, paymentId),
    onSuccess: () => {
      // Refetch payments after returning from checkout
      queryClient.invalidateQueries({ queryKey: ['payments', communityId] })
    },
  })
}

// Returns true if the resident has any overdue or pending payments
export function useHasPendingPayments() {
  const communityId = useCommunityId()
  const { data, isLoading } = useQuery({
    queryKey: ['payments', communityId, 'PENDING'],
    queryFn: () => paymentService.list(communityId, { status: 'PENDING' }),
    enabled: !!communityId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // auto-check every 5 min
  })
  const hasPending = (data?.payments?.length ?? 0) > 0
  return { hasPending, isLoading }
}

export function usePaymentIntent() {
  const communityId = useCommunityId()
  return useMutation({
    mutationFn: (paymentId: string) => paymentService.getPaymentIntent(communityId, paymentId),
  })
}

export function useGenerateFees() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { month: number; year: number; amount?: number }) =>
      paymentService.generateFees(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', communityId] })
    },
  })
}

export function useCreateCharge() {
  const queryClient = useQueryClient()
  const communityId = useAuthStore((s) => s.user?.communityId ?? '')
  return useMutation({
    mutationFn: (data: {
      unitId: string; amount: number; description: string
      type?: 'MAINTENANCE_FEE' | 'FINE' | 'RESERVATION_FEE' | 'OTHER'; dueDate?: string
    }) => paymentService.createCharge(communityId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })
}

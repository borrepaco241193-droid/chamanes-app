import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workOrderService, type WorkOrderStatus } from '../services/workorder.service'
import { useAuthStore } from '../stores/auth.store'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function useWorkOrders(status?: WorkOrderStatus) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['work-orders', communityId, status],
    queryFn: () => workOrderService.list(communityId, { status }),
    enabled: !!communityId,
    staleTime: 30_000,
  })
}

export function useWorkOrder(orderId: string) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['work-order', communityId, orderId],
    queryFn: () => workOrderService.get(communityId, orderId),
    enabled: !!communityId && !!orderId,
  })
}

export function useCreateWorkOrder() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      description: string
      category?: string
      priority?: WorkOrderStatus
      location?: string
    }) => workOrderService.create(communityId, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', communityId] })
    },
  })
}

export function useUpdateWorkOrderStatus() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: WorkOrderStatus }) =>
      workOrderService.updateStatus(communityId, orderId, status),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', communityId] })
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

export function useAddComment() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: string }) =>
      workOrderService.addComment(communityId, orderId, body),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

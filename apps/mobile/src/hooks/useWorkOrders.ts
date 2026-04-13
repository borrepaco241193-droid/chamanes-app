import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workOrderService, type WorkOrderStatus } from '../services/workorder.service'
import { staffService } from '../services/staff.service'
import { useActiveCommunityIds, usePrimaryCommunityId } from './useActiveCommunityIds'

export function useWorkOrders(status?: WorkOrderStatus) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['work-orders', ids, status],
    queryFn: async () => {
      if (ids.length <= 1) return workOrderService.list(ids[0] ?? '', { status })
      const results = await Promise.allSettled(ids.map((id) => workOrderService.list(id, { status })))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = fulfilled.flatMap((r) => r.workOrders ?? r.data ?? []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return { workOrders: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  })
}

export function useWorkOrder(orderId: string) {
  const communityId = usePrimaryCommunityId()
  return useQuery({
    queryKey: ['work-order', communityId, orderId],
    queryFn: () => workOrderService.get(communityId, orderId),
    enabled: !!communityId && !!orderId,
  })
}

export function useCreateWorkOrder() {
  const communityId = usePrimaryCommunityId()
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
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}

export function useUpdateWorkOrderStatus() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: WorkOrderStatus }) =>
      workOrderService.updateStatus(communityId, orderId, status),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

export function useUpdateWorkOrder() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: { priority?: string; status?: string; title?: string; location?: string } }) =>
      workOrderService.update(communityId, orderId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

export function useStaffList() {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['staff-list', ids],
    queryFn: async () => {
      if (ids.length <= 1) return staffService.listStaff(ids[0] ?? '')
      const results = await Promise.allSettled(ids.map((id) => staffService.listStaff(id)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = fulfilled.flatMap((r) => r.staff ?? r.data ?? [])
      return { staff: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  })
}

export function useAssignWorkOrder() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, staffId, notes }: { orderId: string; staffId: string; notes?: string }) =>
      workOrderService.assign(communityId, orderId, staffId, notes),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

export function useAddComment() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: string }) =>
      workOrderService.addComment(communityId, orderId, body),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

export function useUploadWorkOrderPhoto() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, imageUri, mimeType }: { orderId: string; imageUri: string; mimeType: string }) =>
      workOrderService.uploadPhoto(communityId, orderId, imageUri, mimeType),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

export function useRemoveWorkOrderPhoto() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, url }: { orderId: string; url: string }) =>
      workOrderService.removePhoto(communityId, orderId, url),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', communityId, orderId] })
    },
  })
}

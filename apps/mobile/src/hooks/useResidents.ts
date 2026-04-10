import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { residentService } from '../services/resident.service'
import { useAuthStore } from '../stores/auth.store'

function useCommunityId() {
  // Falls back to '' — callers use `enabled: !!communityId` to block fetches when unset.
  // communityId gets set on login (from JWT or communities[0]) or via setCommunity() when
  // a SUPER_ADMIN picks a community from the community selector screen.
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function useUnits(withStats = false) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['units', communityId, withStats],
    queryFn: () => residentService.listUnits(communityId, withStats),
    enabled: !!communityId,
    staleTime: 30_000,
  })
}

export function useCreateUnit() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof residentService.createUnit>[1]) =>
      residentService.createUnit(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents', communityId] })
      queryClient.invalidateQueries({ queryKey: ['units', communityId] })
    },
  })
}

export function useCreateResident() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof residentService.createResident>[1]) =>
      residentService.createResident(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents', communityId] })
    },
  })
}

export function useDeleteResident() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => residentService.deleteResident(communityId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents', communityId] })
    },
  })
}

export function useUploadTransferProof() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, imageUri, mimeType }: { paymentId: string; imageUri: string; mimeType: string }) =>
      residentService.uploadTransferProof(communityId, paymentId, imageUri, mimeType),
    onSuccess: (_, { paymentId }) => {
      queryClient.invalidateQueries({ queryKey: ['payments', communityId] })
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useResidents(params?: { search?: string; block?: string }) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['residents', communityId, params],
    queryFn: () => residentService.list(communityId, params),
    enabled: !!communityId,
    staleTime: 60_000,
  })
}

export function useResident(userId: string, communityIdOverride?: string) {
  const storeCommunityId = useCommunityId()
  const communityId = communityIdOverride || storeCommunityId
  return useQuery({
    queryKey: ['resident', communityId, userId],
    queryFn: () => residentService.get(communityId, userId),
    enabled: !!communityId && !!userId,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useUpdateResident(userId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof residentService.update>[2]) =>
      residentService.update(communityId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', communityId, userId] })
      queryClient.invalidateQueries({ queryKey: ['residents', communityId] })
    },
  })
}

export function useAddMember(unitId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof residentService.addMember>[2]) =>
      residentService.addMember(communityId, unitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useUpdateMember(unitId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Parameters<typeof residentService.updateMember>[3] }) =>
      residentService.updateMember(communityId, unitId, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useDeleteMember(unitId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => residentService.deleteMember(communityId, unitId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useAddVehicle(unitId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof residentService.addVehicle>[2]) =>
      residentService.addVehicle(communityId, unitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useUpdateVehicle(unitId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId: string; data: Parameters<typeof residentService.updateVehicle>[3] }) =>
      residentService.updateVehicle(communityId, unitId, vehicleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useDeleteVehicle(unitId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vehicleId: string) => residentService.deleteVehicle(communityId, unitId, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useMarkPaid() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, data }: {
      paymentId: string
      data: Parameters<typeof residentService.markPaid>[2]
    }) => residentService.markPaid(communityId, paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', communityId] })
      queryClient.invalidateQueries({ queryKey: ['residents', communityId] })
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

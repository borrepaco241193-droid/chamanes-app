import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { residentService } from '../services/resident.service'
import { useAuthStore } from '../stores/auth.store'

/** Primary community ID — used for mutations (create/update/delete) */
function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

/** All selected community IDs — used for list queries to merge across communities */
function useActiveCommunityIds() {
  const ids = useAuthStore((s) => s.activeCommunityIds)
  const single = useAuthStore((s) => s.user?.communityId ?? '')
  return ids.length > 0 ? ids : (single ? [single] : [])
}

export function useUnits(withStats = false) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['units', ids, withStats],
    queryFn: async () => {
      if (ids.length <= 1) return residentService.listUnits(ids[0] ?? '', withStats)
      const results = await Promise.allSettled(ids.map((id) => residentService.listUnits(id, withStats)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const allUnits = fulfilled.flatMap((r) => r.units ?? [])
      const seen = new Set<string>()
      return {
        units: allUnits.filter((u) => { if (seen.has(u.id)) return false; seen.add(u.id); return true }),
        stats: fulfilled.reduce((acc, r) => r.stats ? {
          total: (acc.total ?? 0) + (r.stats.total ?? 0),
          occupied: (acc.occupied ?? 0) + (r.stats.occupied ?? 0),
          vacant: (acc.vacant ?? 0) + (r.stats.vacant ?? 0),
        } : acc, {} as any),
      }
    },
    enabled: ids.length > 0,
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

export function useChangeRole() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      residentService.changeRole(communityId, userId, role),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', communityId] })
      queryClient.invalidateQueries({ queryKey: ['resident', communityId] })
    },
  })
}

export function useResidents(params?: { search?: string; block?: string }) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['residents', ids, params],
    queryFn: async () => {
      if (ids.length <= 1) return residentService.list(ids[0] ?? '', params)
      const results = await Promise.allSettled(ids.map((id) => residentService.list(id, params)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const all = fulfilled.flatMap((r) => r.residents ?? [])
      const seen = new Set<string>()
      const merged = all.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
      return { residents: merged, total: merged.length, page: 1, pages: 1 }
    },
    enabled: ids.length > 0,
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

export function useVerifyAdminOtp() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, otp }: { userId: string; otp: string }) =>
      residentService.verifyAdminOtp(communityId, userId, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents', communityId] })
    },
  })
}

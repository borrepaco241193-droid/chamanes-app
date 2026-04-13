import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

export function useAreas() {
  const { activeCommunityId } = useAuthStore()
  return useQuery({
    queryKey: ['areas', activeCommunityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${activeCommunityId}/common-areas`)
      return data.areas ?? data
    },
    enabled: !!activeCommunityId,
  })
}

export function useCreateArea() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) =>
      api.post(`/communities/${activeCommunityId}/common-areas`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas', activeCommunityId] }),
  })
}

export function useUpdateArea() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ areaId, body }: { areaId: string; body: object }) =>
      api.patch(`/communities/${activeCommunityId}/common-areas/${areaId}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas', activeCommunityId] }),
  })
}

export function useDeleteArea() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (areaId: string) =>
      api.delete(`/communities/${activeCommunityId}/common-areas/${areaId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas', activeCommunityId] }),
  })
}

export function useReservations(status?: string) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['reservations', ids, status],
    queryFn: async () => {
      const params = status && status !== 'ALL' ? `?status=${status}` : ''
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/reservations${params}`)
        return data.reservations ?? data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/reservations${params}`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      return results.flatMap((r) => r.reservations ?? [])
    },
    enabled: ids.length > 0,
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) =>
      api.post(`/communities/${activeCommunityId}/reservations`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useUpdateReservation() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ reservationId, status }: { reservationId: string; status: string }) =>
      api.patch(`/communities/${activeCommunityId}/reservations/${reservationId}`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useApproveReservation() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ reservationId, approve, extraCharge, chargeNote }: {
      reservationId: string; approve: boolean; extraCharge?: number; chargeNote?: string
    }) =>
      api.patch(`/communities/${activeCommunityId}/reservations/${reservationId}/approve`, {
        approve, extraCharge, chargeNote,
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

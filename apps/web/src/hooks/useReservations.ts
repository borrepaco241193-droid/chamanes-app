import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

export function useAreas() {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['areas', ids],
    queryFn: async () => {
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/common-areas`)
        return (data.areas ?? data).map((a: any) => ({ ...a, _communityId: ids[0] }))
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/common-areas`).then((r) => ({ communityId: id, areas: r.data.areas ?? r.data })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      return results.flatMap((r) => (r.areas ?? []).map((a: any) => ({ ...a, _communityId: r.communityId })))
    },
    enabled: ids.length > 0,
  })
}

export function useCreateArea() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ communityId, ...body }: { communityId?: string; [key: string]: any }) =>
      api.post(`/communities/${communityId ?? activeCommunityId}/common-areas`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
  })
}

export function useUpdateArea() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ areaId, communityId, body }: { areaId: string; communityId?: string; body: object }) =>
      api.patch(`/communities/${communityId ?? activeCommunityId}/common-areas/${areaId}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
  })
}

export function useDeleteArea() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ areaId, communityId }: { areaId: string; communityId?: string }) =>
      api.delete(`/communities/${communityId ?? activeCommunityId}/common-areas/${areaId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
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
        return (data.reservations ?? data).map((r: any) => ({ ...r, _communityId: ids[0] }))
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/reservations${params}`).then((r) => ({ communityId: id, data: r.data })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => (r.data.reservations ?? []).map((res: any) => ({ ...res, _communityId: r.communityId })))
      merged.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      return merged
    },
    enabled: ids.length > 0,
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ communityId, ...body }: { communityId?: string; [key: string]: any }) =>
      api.post(`/communities/${communityId ?? activeCommunityId}/reservations`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useUpdateReservation() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ reservationId, status, communityId }: { reservationId: string; status: string; communityId?: string }) =>
      api.patch(`/communities/${communityId ?? activeCommunityId}/reservations/${reservationId}`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useApproveReservation() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ reservationId, approve, extraCharge, chargeNote, communityId }: {
      reservationId: string; approve: boolean; extraCharge?: number; chargeNote?: string; communityId?: string
    }) =>
      api.patch(`/communities/${communityId ?? activeCommunityId}/reservations/${reservationId}/approve`, {
        approve, extraCharge, chargeNote,
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

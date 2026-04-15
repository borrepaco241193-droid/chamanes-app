import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationService } from '../services/reservation.service'
import { useActiveCommunityIds, usePrimaryCommunityId } from './useActiveCommunityIds'

export function useCommonAreas() {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['common-areas', ids],
    queryFn: async () => {
      if (ids.length <= 1) return reservationService.listAreas(ids[0] ?? '')
      const results = await Promise.allSettled(ids.map((id) => reservationService.listAreas(id)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const all = fulfilled.flatMap((r) => r.areas ?? r.data ?? [])
      const seen = new Set<string>()
      const merged = all.filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
      return { areas: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  })
}

export function useTimeSlots(areaId: string, date: string) {
  const communityId = usePrimaryCommunityId()
  return useQuery({
    queryKey: ['time-slots', communityId, areaId, date],
    queryFn: () => reservationService.getSlots(communityId, areaId, date),
    enabled: !!communityId && !!areaId && !!date,
    staleTime: 60_000,
  })
}

export function useReservations(params?: { upcoming?: boolean; status?: string; all?: boolean }) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['reservations', ids, params],
    queryFn: async () => {
      if (ids.length <= 1) return reservationService.list(ids[0] ?? '', params)
      const results = await Promise.allSettled(ids.map((id) => reservationService.list(id, params)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const all = fulfilled.flatMap((r) => r.reservations ?? r.data ?? [])
      const seen = new Set<string>()
      const merged = all.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
        .sort((a: any, b: any) => new Date(b.startTime ?? b.createdAt).getTime() - new Date(a.startTime ?? a.createdAt).getTime())
      return { reservations: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  })
}

export function useApproveReservation() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve, extraCharge, chargeNote }: {
      id: string; approve: boolean; extraCharge?: number; chargeNote?: string
    }) => reservationService.approve(communityId, id, approve, extraCharge, chargeNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useCreateReservation() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      commonAreaId: string
      startTime: string
      endTime: string
      attendees?: number
      title?: string
      notes?: string
    }) => reservationService.create(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['time-slots', communityId] })
    },
  })
}

export function useCancelReservation() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      reservationService.cancel(communityId, id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
  })
}

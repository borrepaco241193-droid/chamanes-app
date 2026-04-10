import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationService } from '../services/reservation.service'
import { useAuthStore } from '../stores/auth.store'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function useCommonAreas() {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['common-areas', communityId],
    queryFn: () => reservationService.listAreas(communityId),
    enabled: !!communityId,
    staleTime: 5 * 60_000,
  })
}

export function useTimeSlots(areaId: string, date: string) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['time-slots', communityId, areaId, date],
    queryFn: () => reservationService.getSlots(communityId, areaId, date),
    enabled: !!communityId && !!areaId && !!date,
    staleTime: 60_000,
  })
}

export function useReservations(upcoming = true) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['reservations', communityId, upcoming],
    queryFn: () => reservationService.list(communityId, upcoming),
    enabled: !!communityId,
    staleTime: 30_000,
  })
}

export function useCreateReservation() {
  const communityId = useCommunityId()
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
      queryClient.invalidateQueries({ queryKey: ['reservations', communityId] })
      queryClient.invalidateQueries({ queryKey: ['time-slots', communityId] })
    },
  })
}

export function useCancelReservation() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      reservationService.cancel(communityId, id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', communityId] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffService } from '../services/staff.service'
import { useAuthStore } from '../stores/auth.store'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function useActiveShift() {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['staff-active-shift', communityId],
    queryFn: () => staffService.getActiveShift(communityId),
    enabled: !!communityId,
    staleTime: 30_000,
    refetchInterval: 60_000, // refresh every minute
  })
}

export function useShiftHistory() {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['staff-shift-history', communityId],
    queryFn: () => staffService.getShiftHistory(communityId),
    enabled: !!communityId,
    staleTime: 60_000,
  })
}

export function useStaffList() {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['staff-list', communityId],
    queryFn: () => staffService.listStaff(communityId),
    enabled: !!communityId,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  })
}

export function useCheckIn() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { notes?: string }) =>
      staffService.checkIn(communityId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-active-shift', communityId] })
      queryClient.invalidateQueries({ queryKey: ['staff-list', communityId] })
    },
  })
}

export function useCheckOut() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { notes?: string }) =>
      staffService.checkOut(communityId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-active-shift', communityId] })
      queryClient.invalidateQueries({ queryKey: ['staff-shift-history', communityId] })
      queryClient.invalidateQueries({ queryKey: ['staff-list', communityId] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffService } from '../services/staff.service'
import { useActiveCommunityIds, usePrimaryCommunityId } from './useActiveCommunityIds'

export function useActiveShift() {
  const communityId = usePrimaryCommunityId()
  return useQuery({
    queryKey: ['staff-active-shift', communityId],
    queryFn: () => staffService.getActiveShift(communityId),
    enabled: !!communityId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useShiftHistory() {
  const communityId = usePrimaryCommunityId()
  return useQuery({
    queryKey: ['staff-shift-history', communityId],
    queryFn: () => staffService.getShiftHistory(communityId),
    enabled: !!communityId,
    staleTime: 60_000,
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
      const all = fulfilled.flatMap((r) => r.staff ?? r.data ?? [])
      const seen = new Set<string>()
      const merged = all.filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true })
      return { staff: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  })
}

export function useCheckIn() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { notes?: string }) =>
      staffService.checkIn(communityId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-active-shift', communityId] })
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
    },
  })
}

export function useCheckOut() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { notes?: string }) =>
      staffService.checkOut(communityId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-active-shift', communityId] })
      queryClient.invalidateQueries({ queryKey: ['staff-shift-history', communityId] })
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
    },
  })
}

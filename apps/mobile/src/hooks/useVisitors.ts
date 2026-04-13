import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { visitorService, type CreateVisitorPassDTO, type ScanQRDTO } from '../services/visitor.service'
import { useActiveCommunityIds, usePrimaryCommunityId } from './useActiveCommunityIds'

// ── Queries ───────────────────────────────────────────────────

export function useVisitorPasses(status?: string) {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['visitor-passes', ids, status],
    queryFn: async () => {
      if (ids.length <= 1) return visitorService.listPasses(ids[0] ?? '', { status: status as any })
      const results = await Promise.allSettled(ids.map((id) => visitorService.listPasses(id, { status: status as any })))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = fulfilled.flatMap((r) => r.passes ?? r.data ?? []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return { passes: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  })
}

export function useVisitorPass(passId: string) {
  const communityId = usePrimaryCommunityId()
  return useQuery({
    queryKey: ['visitor-pass', communityId, passId],
    queryFn: () => visitorService.getPass(communityId, passId),
    enabled: !!communityId && !!passId,
  })
}

export function useAccessEvents() {
  const ids = useActiveCommunityIds()
  return useQuery({
    queryKey: ['access-events-visitor', ids],
    queryFn: async () => {
      if (ids.length <= 1) return visitorService.listAccessEvents(ids[0] ?? '')
      const results = await Promise.allSettled(ids.map((id) => visitorService.listAccessEvents(id)))
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = fulfilled.flatMap((r) => r.events ?? r.data ?? []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return { events: merged, total: merged.length }
    },
    enabled: ids.length > 0,
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateVisitorPass() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVisitorPassDTO) => visitorService.createPass(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-passes'] })
    },
  })
}

export function useRevokeVisitorPass() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ passId, reason }: { passId: string; reason?: string }) =>
      visitorService.revokePass(communityId, passId, reason),
    onSuccess: (_, { passId }) => {
      queryClient.invalidateQueries({ queryKey: ['visitor-passes'] })
      queryClient.invalidateQueries({ queryKey: ['visitor-pass', communityId, passId] })
    },
  })
}

export function useScanQR() {
  const communityId = usePrimaryCommunityId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ScanQRDTO) => visitorService.scanQR(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-events-visitor'] })
    },
  })
}

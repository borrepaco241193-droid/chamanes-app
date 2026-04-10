import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { visitorService, type CreateVisitorPassDTO, type ScanQRDTO } from '../services/visitor.service'
import { useAuthStore } from '../stores/auth.store'

function useCommunityId() {
  const user = useAuthStore((s) => s.user)
  // SUPER_ADMIN has no communityId — return empty string so queries are disabled
  return user?.communityId ?? ''
}

// ── Queries ───────────────────────────────────────────────────

export function useVisitorPasses(status?: string) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['visitor-passes', communityId, status],
    queryFn: () => visitorService.listPasses(communityId, { status: status as any }),
    enabled: !!communityId,
    staleTime: 30_000,
  })
}

export function useVisitorPass(passId: string) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['visitor-pass', communityId, passId],
    queryFn: () => visitorService.getPass(communityId, passId),
    enabled: !!communityId && !!passId,
  })
}

export function useAccessEvents() {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['access-events', communityId],
    queryFn: () => visitorService.listAccessEvents(communityId),
    enabled: !!communityId,
    staleTime: 10_000,
    refetchInterval: 30_000, // auto-refresh every 30s for guards
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateVisitorPass() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVisitorPassDTO) => visitorService.createPass(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-passes', communityId] })
    },
  })
}

export function useRevokeVisitorPass() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ passId, reason }: { passId: string; reason?: string }) =>
      visitorService.revokePass(communityId, passId, reason),
    onSuccess: (_, { passId }) => {
      queryClient.invalidateQueries({ queryKey: ['visitor-passes', communityId] })
      queryClient.invalidateQueries({ queryKey: ['visitor-pass', communityId, passId] })
    },
  })
}

export function useScanQR() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ScanQRDTO) => visitorService.scanQR(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-events', communityId] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { communityService } from '../services/community.service'
import { useAuthStore } from '../stores/auth.store'

export function useCommunities(search?: string) {
  return useQuery({
    queryKey: ['communities', search],
    queryFn: () => communityService.list(search),
    staleTime: 30_000,
  })
}

export function useCreateCommunity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof communityService.create>[0]) =>
      communityService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] })
    },
  })
}

export function useCommunity(communityId?: string) {
  return useQuery({
    queryKey: ['community', communityId],
    queryFn: () => communityService.get(communityId!),
    enabled: !!communityId,
    staleTime: 60_000,
  })
}

export function useUpdateCommunity(communityId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof communityService.update>[1]) =>
      communityService.update(communityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', communityId] })
      queryClient.invalidateQueries({ queryKey: ['communities'] })
    },
  })
}

/** Convenience hook — returns the current community data from the auth store's communityId */
export function useCurrentCommunity() {
  const communityId = useAuthStore((s) => s.user?.communityId)
  return useCommunity(communityId)
}

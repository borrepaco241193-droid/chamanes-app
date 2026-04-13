import { useAuthStore } from '../stores/auth.store'

/**
 * Returns the list of active community IDs for multi-community queries.
 * Falls back to [communityId] if activeCommunityIds is empty.
 */
export function useActiveCommunityIds(): string[] {
  const ids = useAuthStore((s) => s.activeCommunityIds)
  const single = useAuthStore((s) => s.user?.communityId ?? '')
  return ids.length > 0 ? ids : (single ? [single] : [])
}

/** Primary community ID — used for mutations (write operations) */
export function usePrimaryCommunityId(): string {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

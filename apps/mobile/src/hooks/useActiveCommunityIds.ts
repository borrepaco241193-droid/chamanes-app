import { useAuthStore } from '../stores/auth.store'

/**
 * Returns the list of active community IDs for multi-community queries.
 * Priority: activeCommunityIds > user.communities > user.communityId
 * This handles existing sessions (activeCommunityIds=[]) and SUPER_ADMIN (no communityId).
 */
export function useActiveCommunityIds(): string[] {
  const ids = useAuthStore((s) => s.activeCommunityIds)
  const communities = useAuthStore((s) => s.user?.communities)
  const single = useAuthStore((s) => s.user?.communityId ?? '')

  if (ids.length > 0) return ids
  // Fall back to ALL communities the user belongs to
  if (communities && communities.length > 0) return communities.map((c) => c.id)
  return single ? [single] : []
}

/** Primary community ID — used for mutations (write operations) */
export function usePrimaryCommunityId(): string {
  const single = useAuthStore((s) => s.user?.communityId ?? '')
  const communities = useAuthStore((s) => s.user?.communities)
  // SUPER_ADMIN may have no communityId — fall back to first community
  return single || communities?.[0]?.id || ''
}

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
  role: string
  communityId?: string | null
  communityRole?: string | null
  communities?: { id: string; name: string; role: string }[]
}

interface AuthState {
  user: AuthUser | null
  tokens: { accessToken: string; refreshToken: string } | null
  activeCommunityId: string | null
  activeCommunityIds: string[]   // multi-select
  isHydrated: boolean
  setAuth: (user: AuthUser, tokens: { accessToken: string; refreshToken: string }) => void
  setActiveCommunity: (communityId: string) => void
  setActiveCommunityIds: (ids: string[]) => void
  setUser: (user: Partial<AuthUser>) => void
  logout: () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      activeCommunityId: null,
      activeCommunityIds: [],
      isHydrated: false,

      setAuth: (user, tokens) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('access-token', tokens.accessToken)
          sessionStorage.setItem('refresh-token', tokens.refreshToken)
        }
        const communityId = user.communityId ?? user.communities?.[0]?.id ?? null
        // Initialize with ALL communities the user belongs to (not just the first)
        const ids = user.communities && user.communities.length > 0
          ? user.communities.map((c) => c.id)
          : (communityId ? [communityId] : [])
        set({ user, tokens, activeCommunityId: communityId, activeCommunityIds: ids })
      },

      setActiveCommunity: (communityId) =>
        set((s) => ({
          activeCommunityId: communityId,
          activeCommunityIds: s.activeCommunityIds.includes(communityId)
            ? s.activeCommunityIds
            : [communityId],
        })),

      setActiveCommunityIds: (ids) =>
        set({ activeCommunityIds: ids, activeCommunityId: ids[0] ?? null }),

      setUser: (partial) => set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),

      logout: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('access-token')
          sessionStorage.removeItem('refresh-token')
        }
        set({ user: null, tokens: null, activeCommunityId: null, activeCommunityIds: [] })
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'chamanes-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (s) => ({
        user: s.user,
        tokens: s.tokens,
        activeCommunityId: s.activeCommunityId,
        activeCommunityIds: s.activeCommunityIds,
      }),
      onRehydrateStorage: () => (state) => { state?.setHydrated() },
    },
  ),
)

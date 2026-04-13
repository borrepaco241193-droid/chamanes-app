import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { AuthUser, AuthTokens } from '@chamanes/shared'

// ============================================================
// SecureStore adapter for Zustand persist
// Falls back to localStorage on web
// ============================================================

const secureStorage = Platform.OS === 'web'
  ? {
      getItem: async (name: string) => localStorage.getItem(name),
      setItem: async (name: string, value: string) => localStorage.setItem(name, value),
      removeItem: async (name: string) => localStorage.removeItem(name),
    }
  : {
      getItem: async (name: string) => SecureStore.getItemAsync(name),
      setItem: async (name: string, value: string) => SecureStore.setItemAsync(name, value),
      removeItem: async (name: string) => SecureStore.deleteItemAsync(name),
    }

interface AuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isHydrated: boolean
  hasAcceptedTerms: boolean
  /** All currently selected community IDs (multi-select) */
  activeCommunityIds: string[]

  // Actions
  setAuth: (user: AuthUser, tokens: AuthTokens) => void
  setUser: (user: AuthUser) => void
  /** Switch active community without re-login (for SUPER_ADMIN managing multiple communities) */
  setCommunity: (communityId: string, communityRole?: AuthUser['communityRole']) => void
  /** Toggle a community in/out of the active selection */
  toggleCommunity: (communityId: string) => void
  /** Select all communities */
  selectAllCommunities: () => void
  acceptTerms: () => void
  logout: () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isHydrated: false,
      hasAcceptedTerms: false,
      activeCommunityIds: [],

      setAuth: (user, tokens) => {
        const allIds = user.communities?.map((c) => c.id) ?? (user.communityId ? [user.communityId] : [])
        set({ user, tokens, isAuthenticated: true, activeCommunityIds: allIds })
      },

      setUser: (user) =>
        set({ user }),

      setCommunity: (communityId, communityRole) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, communityId, communityRole: communityRole ?? state.user.communityRole }
            : state.user,
        })),

      toggleCommunity: (communityId) =>
        set((state) => {
          const ids = state.activeCommunityIds
          if (ids.includes(communityId)) {
            if (ids.length === 1) return {} // keep at least one
            return { activeCommunityIds: ids.filter((id) => id !== communityId) }
          }
          return { activeCommunityIds: [...ids, communityId] }
        }),

      selectAllCommunities: () =>
        set((state) => ({
          activeCommunityIds: state.user?.communities?.map((c) => c.id) ?? state.activeCommunityIds,
        })),

      acceptTerms: () => set({ hasAcceptedTerms: true }),

      logout: () =>
        set({ user: null, tokens: null, isAuthenticated: false, activeCommunityIds: [] }),

      setHydrated: () =>
        set({ isHydrated: true }),
    }),
    {
      name: 'chamanes-auth',
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
      // Only persist the token and user — not actions
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        hasAcceptedTerms: state.hasAcceptedTerms,
        activeCommunityIds: state.activeCommunityIds,
      }),
    },
  ),
)

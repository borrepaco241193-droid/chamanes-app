import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import type { AuthUser, AuthTokens } from '@chamanes/shared'

// ============================================================
// SecureStore adapter for Zustand persist
// Tokens are stored encrypted on device, never in plain AsyncStorage
// ============================================================

const secureStorage = {
  getItem: async (name: string) => {
    return SecureStore.getItemAsync(name)
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value)
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name)
  },
}

interface AuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isHydrated: boolean

  // Actions
  setAuth: (user: AuthUser, tokens: AuthTokens) => void
  setUser: (user: AuthUser) => void
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

      setAuth: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true }),

      setUser: (user) =>
        set({ user }),

      logout: () =>
        set({ user: null, tokens: null, isAuthenticated: false }),

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
      }),
    },
  ),
)

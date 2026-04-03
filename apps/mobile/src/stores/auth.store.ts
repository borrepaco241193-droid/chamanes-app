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

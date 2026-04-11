import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../stores/auth.store'
import { authService } from '../services/auth.service'

// ============================================================
// Auth hooks — connect React Query mutations to the auth store
// ============================================================

export function useLogin() {
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: authService.login,
    onSuccess: async (data) => {
      await AsyncStorage.setItem('access-token', data.accessToken)
      await AsyncStorage.setItem('refresh-token', data.refreshToken)
      // communityId may be absent for SUPER_ADMIN — fall back to first community
      const communityId = data.user.communityId ?? data.user.communities?.[0]?.id
      const communityRole = data.user.communityRole ?? (data.user.communities?.[0]?.role as any)

      setAuth(
        {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          avatarUrl: data.user.avatarUrl,
          role: data.user.role,
          communityId,
          communityRole,
        },
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        },
      )
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Redirect residents who haven't uploaded their ID yet
      const isResidentRole = communityRole === 'RESIDENT' || (!communityRole && data.user.role === 'RESIDENT')
      const needsIdVerification = isResidentRole && !(data.user as any).idPhotoUploaded
      router.replace(needsIdVerification ? '/(app)/verify-identity' : '/(app)/(tabs)')
    },
  })
}

export function useLogout() {
  const { tokens, logout } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (tokens?.refreshToken) {
        await authService.logout(tokens.refreshToken)
      }
    },
    onSettled: async () => {
      await AsyncStorage.removeItem('access-token').catch(() => {})
      await AsyncStorage.removeItem('refresh-token').catch(() => {})
      logout()
      queryClient.clear()
      router.replace('/(auth)/login')
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: () => {
      router.replace('/(auth)/login')
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(currentPassword, newPassword),
  })
}

export function useMe() {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ['me'],
    queryFn: authService.getMe,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })
}

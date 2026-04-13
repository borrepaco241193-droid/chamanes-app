import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import * as SecureStore from 'expo-secure-store'
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
      await SecureStore.setItemAsync('access-token', data.accessToken)
      await SecureStore.setItemAsync('refresh-token', data.refreshToken)
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
          communities: data.user.communities,
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
      await SecureStore.deleteItemAsync('access-token').catch(() => {})
      await SecureStore.deleteItemAsync('refresh-token').catch(() => {})
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

export function useUpdateProfile() {
  const { user, setUser } = useAuthStore()
  return useMutation({
    mutationFn: (data: { firstName?: string; lastName?: string; phone?: string }) =>
      authService.updateProfile(data),
    onSuccess: (updated) => {
      if (user) setUser({ ...user, firstName: updated.firstName, lastName: updated.lastName })
    },
  })
}

export function useChangeEmail() {
  const { user, setUser } = useAuthStore()
  return useMutation({
    mutationFn: ({ newEmail, currentPassword }: { newEmail: string; currentPassword: string }) =>
      authService.changeEmail(newEmail, currentPassword),
    onSuccess: (_data, variables) => {
      if (user) setUser({ ...user, email: variables.newEmail })
    },
  })
}

export function useMe() {
  const { isAuthenticated, user, setUser, activeCommunityIds, selectAllCommunities } = useAuthStore()
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const result = await authService.getMe()
      // Sync fresh communities to the auth store so multi-community switcher works
      const freshCommunities = (result as any).communities
      if (user && Array.isArray(freshCommunities) && freshCommunities.length > 0) {
        const updatedUser = { ...user, communities: freshCommunities }
        setUser(updatedUser)
        // Initialize activeCommunityIds if still empty (existing sessions before feature was added)
        if (activeCommunityIds.length === 0) {
          useAuthStore.setState({
            activeCommunityIds: freshCommunities.map((c: any) => c.id),
          })
        }
      }
      return result
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUploadAvatar() {
  const { user, setUser } = useAuthStore()
  return useMutation({
    mutationFn: ({ imageUri, mimeType }: { imageUri: string; mimeType: string }) =>
      authService.uploadAvatar(imageUri, mimeType),
    onSuccess: (data) => {
      if (user) {
        setUser({ ...user, avatarUrl: data.avatarUrl })
      }
    },
  })
}

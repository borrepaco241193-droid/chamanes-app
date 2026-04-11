import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/notification.service'
import { useAuthStore } from '../stores/auth.store'

export function useNotifications(page = 1) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationService.getNotifications(page),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every minute for new notifications
  })
}

export function useUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['notifications', 1],
    queryFn: () => notificationService.getNotifications(1),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
    select: (data) => data.unreadCount,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

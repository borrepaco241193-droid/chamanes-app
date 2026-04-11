import api from '../lib/api'

// ============================================================
// Notification API calls
// ============================================================

export interface AppNotification {
  id: string
  title: string
  body: string
  type: string
  data: Record<string, unknown>
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationsListResponse {
  notifications: AppNotification[]
  total: number
  page: number
  pages: number
  unreadCount: number
}

export const notificationService = {
  registerPushToken: async (pushToken: string): Promise<void> => {
    await api.put('/notifications/push-token', { pushToken })
  },

  getNotifications: async (page = 1): Promise<NotificationsListResponse> => {
    const { data } = await api.get<{ data: NotificationsListResponse }>('/notifications', {
      params: { page },
    })
    return data.data
  },

  markRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read`)
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all')
  },

  seedDemo: async (): Promise<{ created: number }> => {
    const { data } = await api.post<{ data: { created: number } }>('/notifications/seed-demo')
    return data.data
  },
}

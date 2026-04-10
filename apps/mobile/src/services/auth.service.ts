import api from '../lib/api'
import type { AuthTokens, AuthUser } from '@chamanes/shared'

// ============================================================
// Auth API calls — thin wrappers over the Axios instance
// React Query mutations call these in the hooks layer
// ============================================================

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser & {
    communities: Array<{
      id: string
      name: string
      logoUrl?: string
      role: string
    }>
  }
}

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post<{ data: LoginResponse }>('/auth/login', payload)
    return data.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken })
  },

  refreshTokens: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await api.post<{ data: AuthTokens }>('/auth/refresh', { refreshToken })
    return data.data
  },

  getMe: async () => {
    const { data } = await api.get<{ data: AuthUser }>('/auth/me')
    return data.data
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email })
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password })
  },

  verifyEmail: async (token: string): Promise<void> => {
    await api.post('/auth/verify-email', { token })
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },
}

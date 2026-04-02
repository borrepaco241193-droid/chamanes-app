import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000'

// ============================================================
// Axios instance with JWT interceptor
// - Attaches access token to every request
// - Auto-refreshes token on 401, retries original request
// - Logs out on refresh failure
// ============================================================

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': '1.0.0',
  },
})

// Request interceptor: attach Bearer token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const stored = await SecureStore.getItemAsync('chamanes-auth')
  if (stored) {
    const parsed = JSON.parse(stored)
    const token = parsed?.state?.tokens?.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor: handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const stored = await SecureStore.getItemAsync('chamanes-auth')
        if (!stored) throw new Error('No stored auth')

        const parsed = JSON.parse(stored)
        const refreshToken = parsed?.state?.tokens?.refreshToken
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken })

        // Update stored tokens
        parsed.state.tokens = data.data
        await SecureStore.setItemAsync('chamanes-auth', JSON.stringify(parsed))

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(originalRequest)
      } catch {
        // Refresh failed — force logout
        await SecureStore.deleteItemAsync('chamanes-auth')
        // Navigation to login happens via auth store hydration
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default api

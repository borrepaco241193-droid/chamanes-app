import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'

// EXPO_PUBLIC_ variables are inlined at build time by Metro
// .env.local sets EXPO_PUBLIC_API_URL for local dev
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  'http://192.168.1.76:3000'

// ============================================================
// Axios instance with JWT interceptor
// - Attaches access token to every request (reads from Zustand store directly)
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

// Lazy import to avoid circular dependency (store imports api, api imports store)
function getStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../stores/auth.store').useAuthStore
}

// Request interceptor: attach Bearer token synchronously from in-memory store
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStore().getState().tokens?.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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
        const store = getStore().getState()
        const refreshToken = store.tokens?.refreshToken
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken })

        // Update store with new tokens (persist middleware handles SecureStore write)
        store.setAuth(store.user!, data.data)

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(originalRequest)
      } catch {
        // Refresh failed — force logout
        getStore().getState().logout()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default api

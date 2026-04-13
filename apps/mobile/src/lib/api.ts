import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  'http://192.168.1.77:3000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': '1.0.0',
  },
})

// ── Request interceptor ───────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor — auto refresh on 401 ───────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        const refresh = await SecureStore.getItemAsync('refresh-token')
        if (!refresh) throw new Error('no refresh token')

        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
          refreshToken: refresh,
        })
        const tokens = data?.data ?? data

        await SecureStore.setItemAsync('access-token', tokens.accessToken)
        await SecureStore.setItemAsync('refresh-token', tokens.refreshToken)

        original.headers.Authorization = `Bearer ${tokens.accessToken}`
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync('access-token')
        await SecureStore.deleteItemAsync('refresh-token')
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default api

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', 'X-App-Version': '1.0.0' },
})

// ── Request — attach access token ────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('access-token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response — auto-refresh on 401 ───────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = sessionStorage.getItem('refresh-token')
        if (!refresh) throw new Error('no refresh token')

        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken: refresh })
        const tokens = data?.data ?? data

        sessionStorage.setItem('access-token', tokens.accessToken)
        sessionStorage.setItem('refresh-token', tokens.refreshToken)
        original.headers.Authorization = `Bearer ${tokens.accessToken}`
        return api(original)
      } catch {
        sessionStorage.removeItem('access-token')
        sessionStorage.removeItem('refresh-token')
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)

export default api

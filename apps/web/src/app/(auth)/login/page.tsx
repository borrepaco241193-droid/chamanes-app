'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff, Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const login = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/login', { email, password })
      return data.data
    },
    onSuccess: (data) => {
      const communityId = data.user.communityId ?? data.user.communities?.[0]?.id
      const communityRole = data.user.communityRole ?? data.user.communities?.[0]?.role
      setAuth({ ...data.user, communityId, communityRole }, { accessToken: data.accessToken, refreshToken: data.refreshToken })
      router.replace('/dashboard')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Credenciales incorrectas')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    login.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Chamanes</h1>
          <p className="text-blue-200 mt-1">Panel de Administración</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full py-2.5 text-base"
            >
              {login.isPending ? 'Iniciando sesión...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/forgot-password" className="text-sm text-brand-600 hover:text-brand-700">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          Solo accesible para administradores y managers autorizados
        </p>
      </div>
    </div>
  )
}

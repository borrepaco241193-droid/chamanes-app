'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const send = useMutation({
    mutationFn: () => api.post('/auth/forgot-password', { email }),
    onSuccess: () => setSent(true),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Chamanes</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Link href="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Volver al login
          </Link>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Recuperar contraseña</h2>
          {!sent ? (
            <>
              <p className="text-sm text-gray-500 mb-5">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
              <form onSubmit={(e) => { e.preventDefault(); send.mutate() }} className="space-y-4">
                <div>
                  <label className="label">Correo electrónico</label>
                  <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
                <button type="submit" disabled={send.isPending} className="btn-primary w-full py-2.5">
                  {send.isPending ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📧</div>
              <p className="text-gray-700 font-medium">Enlace enviado</p>
              <p className="text-sm text-gray-500 mt-2">Si el correo existe, recibirás las instrucciones en breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

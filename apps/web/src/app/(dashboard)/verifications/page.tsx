'use client'
import { useState } from 'react'
import { useIdVerifications, useVerifyId } from '@/hooks/useStaff'
import { formatDate, fullName, ID_STATUS_COLOR, ID_STATUS_LABEL } from '@/lib/utils'
import { ShieldCheck, X, CheckCircle, XCircle } from 'lucide-react'
import Image from 'next/image'

const TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

export default function VerificationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('PENDING')
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const { data, isLoading } = useIdVerifications(tab)
  const verifyId = useVerifyId()
  const users = Array.isArray(data) ? data : []

  const handleApprove = (userId: string) => verifyId.mutate({ userId, approve: true })
  const handleReject = (userId: string) => {
    verifyId.mutate({ userId, approve: false, note: rejectNote }, {
      onSuccess: () => { setRejectModal(null); setRejectNote('') },
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verificaciones de Identidad</h1>
        <p className="text-gray-500 text-sm">Revisión de documentos oficiales de residentes</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'ALL' ? 'Todos' : ID_STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && [...Array(3)].map((_, i) => <div key={i} className="card p-5 h-48 animate-pulse bg-gray-100" />)}
        {!isLoading && users.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <ShieldCheck className="w-10 h-10 text-gray-200 mb-3" />
            <p>Sin verificaciones {tab !== 'ALL' ? ID_STATUS_LABEL[tab].toLowerCase() + 's' : ''}</p>
          </div>
        )}
        {users.map((u: any) => (
          <div key={u.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{fullName(u)}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <span className={`badge ${ID_STATUS_COLOR[u.idVerificationStatus]}`}>
                {ID_STATUS_LABEL[u.idVerificationStatus]}
              </span>
            </div>

            {u.idPhotoUrl && (
              <button onClick={() => setPhotoModal(u.idPhotoUrl)} className="block w-full">
                <Image
                  src={u.idPhotoUrl}
                  alt="ID"
                  width={300}
                  height={180}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                />
              </button>
            )}

            {u.idVerificationNote && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">{u.idVerificationNote}</p>
            )}

            <p className="text-xs text-gray-400">Actualizado: {formatDate(u.updatedAt)}</p>

            {u.idVerificationStatus === 'PENDING' && u.idPhotoUrl && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(u.id)}
                  disabled={verifyId.isPending}
                  className="btn-primary flex-1 py-1.5 text-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Aprobar
                </button>
                <button
                  onClick={() => setRejectModal(u.id)}
                  className="btn-danger flex-1 py-1.5 text-sm"
                >
                  <XCircle className="w-4 h-4" /> Rechazar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Photo lightbox */}
      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPhotoModal(null)} className="absolute -top-10 right-0 text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <Image src={photoModal} alt="ID Document" width={800} height={500} className="w-full rounded-xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Motivo de rechazo</h3>
            <textarea
              className="input"
              rows={3}
              placeholder="Ej: Foto ilegible, no coincide con el nombre..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleReject(rejectModal)} disabled={verifyId.isPending} className="btn-danger flex-1">
                {verifyId.isPending ? 'Enviando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

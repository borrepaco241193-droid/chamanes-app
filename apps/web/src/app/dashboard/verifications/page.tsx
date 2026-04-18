'use client'
import { useState } from 'react'
import { useIdVerifications, useVerifyId } from '@/hooks/useStaff'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { formatDate, fullName, ID_STATUS_COLOR, ID_STATUS_LABEL } from '@/lib/utils'
import { ShieldCheck, ShieldAlert, ShieldX, Clock, CheckCircle2, XCircle, X, Eye, User, FlaskConical } from 'lucide-react'

const TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

const TAB_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  ALL:      { label: 'Todos',     icon: ShieldCheck,  color: 'text-gray-600' },
  PENDING:  { label: 'Pendientes', icon: Clock,        color: 'text-amber-600' },
  APPROVED: { label: 'Aprobados', icon: ShieldCheck,  color: 'text-green-600' },
  REJECTED: { label: 'Rechazados', icon: ShieldX,    color: 'text-red-600' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: any; label: string; cls: string }> = {
    PENDING:      { icon: Clock,         label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    APPROVED:     { icon: CheckCircle2,  label: 'Aprobado',   cls: 'bg-green-50 text-green-700 border border-green-200' },
    REJECTED:     { icon: XCircle,       label: 'Rechazado',  cls: 'bg-red-50 text-red-700 border border-red-200' },
    NOT_SUBMITTED:{ icon: ShieldAlert,   label: 'Sin enviar', cls: 'bg-gray-50 text-gray-500 border border-gray-200' },
  }
  const c = cfg[status] ?? cfg.NOT_SUBMITTED
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}

function UserInitials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div className="w-11 h-11 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
      <span className="text-violet-700 font-bold text-sm uppercase">{initials}</span>
    </div>
  )
}

export default function VerificationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('PENDING')
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string; communityId?: string } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')
  const { data, isLoading } = useIdVerifications(tab)
  const verifyId = useVerifyId()
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const communityId = activeCommunityId ?? activeCommunityIds[0]
  const users = Array.isArray(data) ? data : []

  const pendingCount = tab === 'PENDING' ? users.length : 0

  const handleSeedId = async () => {
    setSeeding(true)
    setSeedMsg('')
    try {
      const { data: res } = await api.post(`/communities/${communityId}/admin/seed-id`)
      setSeedMsg(`Dato creado: ${res.user?.firstName} ${res.user?.lastName} ahora tiene una verificación pendiente.`)
      qc.invalidateQueries({ queryKey: ['id-verifications'] })
    } catch (err: any) {
      setSeedMsg(err?.response?.data?.error ?? 'Error al crear dato de prueba')
    } finally {
      setSeeding(false)
    }
  }

  const handleApprove = (userId: string, communityId?: string) => verifyId.mutate({ userId, approve: true, communityId })
  const handleReject = () => {
    if (!rejectModal) return
    verifyId.mutate({ userId: rejectModal.id, approve: false, note: rejectNote, communityId: rejectModal.communityId }, {
      onSuccess: () => { setRejectModal(null); setRejectNote('') },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verificaciones de Identidad</h1>
          <p className="text-gray-500 text-sm mt-0.5">Revisión de documentos oficiales de residentes</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'PENDING' && users.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              {users.length} pendiente{users.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleSeedId}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors disabled:opacity-50"
            title="Simula que un residente sube su foto de ID para poder probar la verificación"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {seeding ? 'Creando...' : 'Dato de prueba'}
          </button>
        </div>
      </div>
      {seedMsg && (
        <div className={`text-sm px-4 py-2 rounded-xl border ${seedMsg.startsWith('Error') || seedMsg.startsWith('No hay') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
          {seedMsg}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => {
          const cfg = TAB_CONFIG[t]
          const Icon = cfg.icon
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab === t ? cfg.color : ''}`} />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 h-64 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700 text-lg">
            {tab === 'PENDING' ? 'Sin verificaciones pendientes' : `Sin registros ${TAB_CONFIG[tab].label.toLowerCase()}`}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'PENDING' ? 'Todas las solicitudes han sido revisadas.' : 'Cambia el filtro para ver otros estados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u: any) => (
            <div key={u.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Card header */}
              <div className="flex items-start gap-3 p-4 border-b border-gray-100">
                <UserInitials name={fullName(u) || 'U'} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{fullName(u)}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  <div className="mt-1.5">
                    <StatusBadge status={u.idVerificationStatus} />
                  </div>
                </div>
              </div>

              {/* ID Photo */}
              <div className="p-4">
                {u.idPhotoUrl ? (
                  <button
                    onClick={() => setPhotoModal(u.idPhotoUrl)}
                    className="relative group block w-full rounded-xl overflow-hidden border border-gray-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.idPhotoUrl}
                      alt="Documento de identidad"
                      className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        el.parentElement!.innerHTML = `<div class="w-full h-36 flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-2"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span class="text-xs">Error al cargar la imagen</span></div>`
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white/90 rounded-full p-2">
                        <Eye className="w-4 h-4 text-gray-700" />
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="w-full h-36 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <User className="w-8 h-8 text-gray-300" />
                    <span className="text-xs">Sin foto de identificación</span>
                  </div>
                )}

                {u.idVerificationNote && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700 font-medium">Nota:</p>
                    <p className="text-xs text-amber-600 mt-0.5">{u.idVerificationNote}</p>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  Actualizado: {formatDate(u.updatedAt)}
                </p>
              </div>

              {/* Actions */}
              {u.idVerificationStatus === 'PENDING' && (
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={() => handleApprove(u.id, u._communityId)}
                    disabled={verifyId.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: u.id, name: fullName(u), communityId: u._communityId })}
                    disabled={verifyId.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo lightbox */}
      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-white/60 text-xs mb-2 text-center">Toca fuera para cerrar</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoModal} alt="Documento de identidad" className="w-full rounded-2xl object-contain max-h-[80vh] shadow-2xl" />
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Rechazar verificación</h3>
                <p className="text-xs text-gray-500">{rejectModal.name}</p>
              </div>
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              rows={3}
              placeholder="Ej: Foto ilegible, documento vencido, no coincide con el nombre..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={verifyId.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {verifyId.isPending ? 'Enviando...' : <><XCircle className="w-4 h-4" /> Rechazar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

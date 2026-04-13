'use client'
import { useState } from 'react'
import { useVisitorPasses } from '@/hooks/useStaff'
import { formatDateTime, fullName } from '@/lib/utils'
import { QrCode, X } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  USED: 'bg-blue-100 text-blue-800',
  EXPIRED: 'bg-gray-100 text-gray-500',
  REVOKED: 'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo', USED: 'Usado', EXPIRED: 'Vencido', REVOKED: 'Revocado',
}

const TABS = ['ALL', 'ACTIVE', 'USED', 'EXPIRED', 'REVOKED'] as const

export default function VisitorsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [qrModal, setQrModal] = useState<any>(null)
  const { data, isLoading } = useVisitorPasses(tab)
  const passes = Array.isArray(data) ? data : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pases de Visitante</h1>
        <p className="text-gray-500 text-sm">Códigos QR generados por residentes</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'ALL' ? 'Todos' : STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Visitante</th>
                <th className="table-th">Generado por</th>
                <th className="table-th">Teléfono</th>
                <th className="table-th">Placa</th>
                <th className="table-th">Válido desde</th>
                <th className="table-th">Válido hasta</th>
                <th className="table-th">Usos</th>
                <th className="table-th">Estado</th>
                <th className="table-th">QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={9} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && passes.length === 0 && (
                <tr><td colSpan={9} className="table-td text-center py-12">
                  <QrCode className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">No hay pases registrados</p>
                </td></tr>
              )}
              {passes.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{p.visitorName}</td>
                  <td className="table-td text-gray-500">{fullName(p.createdBy)}</td>
                  <td className="table-td text-gray-500">{p.visitorPhone ?? '—'}</td>
                  <td className="table-td text-gray-500">{p.plateNumber ?? '—'}</td>
                  <td className="table-td text-gray-500">{formatDateTime(p.validFrom)}</td>
                  <td className="table-td text-gray-500">{formatDateTime(p.validUntil)}</td>
                  <td className="table-td text-center">{p.usedCount}/{p.maxUses}</td>
                  <td className="table-td"><span className={`badge ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td className="table-td">
                    {p.qrCodeImageUrl && (
                      <button onClick={() => setQrModal(p)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg">
                        <QrCode className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">QR — {qrModal.visitorName}</h3>
              <button onClick={() => setQrModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <img src={qrModal.qrCodeImageUrl} alt="QR Code" className="w-64 h-64 object-contain mx-auto" />
            <p className="text-xs text-gray-400 mt-3">Válido hasta: {formatDateTime(qrModal.validUntil)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

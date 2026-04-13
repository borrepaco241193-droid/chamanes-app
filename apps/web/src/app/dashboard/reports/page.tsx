'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { BarChart3, Download, FileText } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const REPORTS = [
  { type: 'access', label: 'Accesos al fraccionamiento', description: 'Registro de entradas y salidas por fecha', icon: '🚪' },
  { type: 'payments', label: 'Pagos y cuotas', description: 'Estado de pagos: pendientes, cobrados y vencidos', icon: '💳' },
  { type: 'reservations', label: 'Reservaciones de áreas', description: 'Historial de reservaciones de áreas comunes', icon: '📅' },
  { type: 'visitors', label: 'Pases de visitantes', description: 'Todos los pases QR generados', icon: '👤' },
  { type: 'summary', label: 'Resumen ejecutivo', description: 'Estadísticas consolidadas del período', icon: '📊' },
] as const

export default function ReportsPage() {
  const { activeCommunityId, tokens } = useAuthStore()
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [downloading, setDownloading] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const download = async (type: string) => {
    if (!activeCommunityId || !tokens) return
    setDownloading(type)
    setSuccess(null)
    try {
      const params = new URLSearchParams({ from, to })
      const url = `${API_URL}/api/v1/communities/${activeCommunityId}/admin/csv/${type}?${params}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      if (!res.ok) throw new Error('Error al descargar')
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${type}_${from}_${to}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
      setSuccess(type)
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      alert('Error al generar el reporte. Intenta de nuevo.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm">Exporta datos en formato CSV</p>
      </div>

      {/* Date range picker */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Período del reporte</h3>
        <div className="flex items-center gap-4">
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="pt-6 text-sm text-gray-500">
            <p>Los reportes incluirán datos del</p>
            <p className="font-medium">{from} al {to}</p>
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <div key={r.type} className="card p-5 flex items-start gap-4">
            <div className="text-3xl">{r.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{r.label}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>
            </div>
            <button
              onClick={() => download(r.type)}
              disabled={downloading === r.type}
              className={`btn flex-shrink-0 ${success === r.type ? 'bg-green-600 text-white' : 'btn-secondary'}`}
            >
              {downloading === r.type ? (
                <span className="animate-spin">⏳</span>
              ) : success === r.type ? (
                <>✓ Descargado</>
              ) : (
                <><Download className="w-4 h-4" /> Descargar CSV</>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="card p-5 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Abre los CSV con Excel o Google Sheets</p>
            <p className="text-sm text-blue-700 mt-0.5">Los archivos incluyen BOM UTF-8 para compatibilidad con Excel en Windows. Si ves caracteres extraños, importa el archivo seleccionando codificación UTF-8.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { BarChart3, Download, FileText, Building2 } from 'lucide-react'

const REPORTS = [
  { type: 'access',        label: 'Accesos al fraccionamiento', description: 'Registro de entradas y salidas por fecha', icon: '🚪' },
  { type: 'payments',      label: 'Pagos y cuotas',            description: 'Estado de pagos: pendientes, cobrados y vencidos', icon: '💳' },
  { type: 'reservations',  label: 'Reservaciones de áreas',    description: 'Historial de reservaciones de áreas comunes', icon: '📅' },
  { type: 'visitors',      label: 'Pases de visitantes',       description: 'Todos los pases QR generados', icon: '👤' },
  { type: 'summary',       label: 'Resumen ejecutivo',         description: 'Estadísticas consolidadas del período', icon: '📊' },
] as const

// Parse a CSV string into [headers[], rows[][]]
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const split = (line: string) => {
    const result: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ } else if (ch === ',' && !inQ) { result.push(cur); cur = '' } else { cur += ch }
    }
    result.push(cur)
    return result
  }
  const headers = split(lines[0])
  const rows = lines.slice(1).map(split)
  return { headers, rows }
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\r\n')
}

export default function ReportsPage() {
  const { activeCommunityId, activeCommunityIds, user } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])
  const communityMap = Object.fromEntries((user?.communities ?? []).map((c: any) => [c.id, c.name]))
  const multiCommunity = ids.length > 1

  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [downloading, setDownloading] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const download = async (type: string) => {
    if (!ids.length) return
    setDownloading(type)
    setSuccess(null)
    try {
      const params = new URLSearchParams({ from, to })

      if (!multiCommunity) {
        // Single community — direct download via axios (uses fresh session token)
        const response = await api.get(`/communities/${ids[0]}/admin/csv/${type}?${params}`, { responseType: 'blob' })
        triggerDownload(response.data, `${type}_${from}_${to}.csv`)
      } else {
        // Multi-community — fetch all, merge with a "Comunidad" column
        const settled = await Promise.allSettled(
          ids.map(async (id) => {
            const response = await api.get(`/communities/${id}/admin/csv/${type}?${params}`, { responseType: 'text' })
            return { communityId: id, text: response.data as string }
          })
        )

        const fulfilled = settled
          .filter((r): r is PromiseFulfilledResult<{ communityId: string; text: string }> => r.status === 'fulfilled')
          .map((r) => r.value)

        if (fulfilled.length === 0) throw new Error('No se pudieron descargar los reportes')

        // Merge: add "Comunidad" column to all rows
        let mergedHeaders: string[] = []
        const mergedRows: string[][] = []

        fulfilled.forEach(({ communityId, text }) => {
          const { headers, rows } = parseCSV(text)
          if (headers.length === 0) return
          if (mergedHeaders.length === 0) {
            mergedHeaders = ['Comunidad', ...headers]
          }
          const cName = communityMap[communityId] ?? communityId
          rows.forEach((row) => mergedRows.push([cName, ...row]))
        })

        const csvText = '\uFEFF' + toCSV(mergedHeaders, mergedRows) // BOM for Excel
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
        triggerDownload(blob, `${type}_combinado_${from}_${to}.csv`)
      }

      setSuccess(type)
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      alert('Error al generar el reporte. Intenta de nuevo.')
    } finally {
      setDownloading(null)
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm">Exporta datos en formato CSV</p>
      </div>

      {multiCommunity && (
        <div className="card p-4 border-brand-200 bg-brand-50 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-900">Modo multi-complejo activo</p>
            <p className="text-xs text-brand-700 mt-0.5">
              Los reportes combinarán datos de: {ids.map((id) => communityMap[id] ?? id).join(', ')}.
              Se descargará un solo CSV con columna "Comunidad" identificando cada registro.
            </p>
          </div>
        </div>
      )}

      {/* Date range picker */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Período del reporte</h3>
        <div className="flex items-center gap-4 flex-wrap">
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
                <><Download className="w-4 h-4" /> {multiCommunity ? 'CSV combinado' : 'Descargar CSV'}</>
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

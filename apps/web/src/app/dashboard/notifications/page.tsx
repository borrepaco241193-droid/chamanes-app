'use client'
import { useState } from 'react'
import { Bell, Sparkles } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const NOTIFICATION_TYPES = [
  { key: 'payments', label: 'Pagos pendientes y cobros', description: 'Recibe alertas cuando un residente tiene un pago pendiente o se registra un cobro.' },
  { key: 'visitors', label: 'Pases de visitante', description: 'Notificaciones cuando se crea o usa un pase de visitante.' },
  { key: 'access', label: 'Accesos al complejo', description: 'Alertas de entradas y salidas registradas por el sistema.' },
  { key: 'workorders', label: 'Órdenes de trabajo', description: 'Actualizaciones de estado de las órdenes de mantenimiento.' },
  { key: 'reservations', label: 'Reservaciones de áreas', description: 'Solicitudes de reservación que requieren aprobación.' },
  { key: 'verifications', label: 'Verificaciones de identidad', description: 'Cuando un residente sube su documento de identidad para verificar.' },
  { key: 'forum', label: 'Publicaciones del foro', description: 'Nuevas publicaciones en el foro comunitario.' },
]

export default function NotificationsSettingsPage() {
  const qc = useQueryClient()
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t.key, true]))
  )
  const [saved, setSaved] = useState(false)

  const seedDemo = useMutation({
    mutationFn: () => api.post('/notifications/seed-demo').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-header'] }),
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de notificaciones</h1>
        <p className="text-gray-500 text-sm">Personaliza qué alertas recibes en la app móvil</p>
      </div>

      <div className="card divide-y divide-gray-100">
        {NOTIFICATION_TYPES.map((type) => (
          <div key={type.key} className="flex items-start justify-between p-5 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{type.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={prefs[type.key]}
                onChange={(e) => setPrefs({ ...prefs, [type.key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">Guardar preferencias</button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Preferencias guardadas</span>}
      </div>

      <div className="card p-5 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700 font-medium mb-1">Notificaciones push en móvil</p>
        <p className="text-xs text-blue-600">Las notificaciones push se envían directamente a la app móvil de los usuarios registrados. Asegúrate de que los usuarios hayan dado permiso de notificaciones en su dispositivo.</p>
      </div>

      <div className="card p-5 border-dashed border-2 border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-1">Notificaciones de prueba</p>
        <p className="text-xs text-gray-500 mb-3">Genera notificaciones de ejemplo para visualizar cómo se ven en la campana del encabezado.</p>
        <button
          onClick={() => seedDemo.mutate()}
          disabled={seedDemo.isPending || seedDemo.isSuccess}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {seedDemo.isPending ? 'Creando...' : seedDemo.isSuccess ? '✓ Notificaciones creadas' : 'Crear notificaciones de prueba'}
        </button>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { Bell, CheckCheck, Check, Filter } from 'lucide-react'
import Link from 'next/link'

const NOTIF_ICONS: Record<string, string> = {
  visitor_arrived:       '🚪',
  payment_due:           '💰',
  payment_confirmed:     '✅',
  reservation_confirmed: '📅',
  reservation_charge:    '🧾',
  work_order:            '🔧',
  announcement:          '📢',
  id_verification:       '🪪',
}

const NOTIF_LINKS: Record<string, string> = {
  visitor_arrived:       '/dashboard/visitors',
  payment_due:           '/dashboard/payments',
  payment_confirmed:     '/dashboard/payments',
  reservation_confirmed: '/dashboard/reservations',
  reservation_charge:    '/dashboard/payments',
  work_order:            '/dashboard/workorders',
  announcement:          '/dashboard/forum',
  id_verification:       '/dashboard/verifications',
}

const NOTIF_LABELS: Record<string, string> = {
  visitor_arrived:       'Visita',
  payment_due:           'Pago pendiente',
  payment_confirmed:     'Pago confirmado',
  reservation_confirmed: 'Reservación',
  reservation_charge:    'Cargo',
  work_order:            'Orden de trabajo',
  announcement:          'Anuncio',
  id_verification:       'Verificación',
}

function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications-page', page],
    queryFn: async () => {
      const { data } = await api.get(`/notifications?page=${page}&limit=30`)
      return data?.data ?? data
    },
    refetchInterval: 30_000,
  })
}

function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-page'] })
      qc.invalidateQueries({ queryKey: ['notifications-header'] })
    },
  })
}

function useMarkOneRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-page'] })
      qc.invalidateQueries({ queryKey: ['notifications-header'] })
    },
  })
}

type FilterType = 'all' | 'unread' | 'read'

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>('all')
  const { data, isLoading } = useNotifications(page)
  const markAllRead = useMarkAllRead()
  const markOneRead = useMarkOneRead()

  const allNotifications: any[] = data?.notifications ?? []
  const unreadCount: number = data?.unreadCount ?? 0

  const notifications = filter === 'all'
    ? allNotifications
    : filter === 'unread'
      ? allNotifications.filter((n) => !n.isRead)
      : allNotifications.filter((n) => n.isRead)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-200 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {markAllRead.isPending ? 'Marcando...' : 'Marcar todas como leídas'}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['all', 'Todas'], ['unread', 'Sin leer'], ['read', 'Leídas']] as [FilterType, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
            {key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-medium text-gray-700">
              {filter === 'unread' ? 'No hay notificaciones sin leer' : 'Sin notificaciones'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'unread' ? 'Estás al día con todo.' : 'Las notificaciones aparecerán aquí.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n: any) => {
              const href = NOTIF_LINKS[n.type] ?? '#'
              const icon = NOTIF_ICONS[n.type] ?? '🔔'
              const label = NOTIF_LABELS[n.type] ?? 'Notificación'
              return (
                <div key={n.id} className={`flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/40' : ''}`}>
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                      {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                    </div>
                    <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {href !== '#' && (
                      <Link
                        href={href}
                        onClick={() => { if (!n.isRead) markOneRead.mutate(n.id) }}
                        className="px-2.5 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Ver →
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markOneRead.mutate(n.id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.pages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-40 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-500">Página {page} de {data?.pages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (data?.pages ?? 1)}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-40 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Settings link */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          Las notificaciones push se envían a la app móvil. Configura tus preferencias en{' '}
          <Link href="/dashboard/settings" className="text-brand-600 hover:underline">Configuración</Link>.
        </p>
      </div>
    </div>
  )
}

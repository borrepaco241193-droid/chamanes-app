'use client'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { ROLE_LABEL, timeAgo } from '@/lib/utils'
import { Bell, X, CheckCheck } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

function useNotifications() {
  return useQuery({
    queryKey: ['notifications-header'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=15')
      return data?.data ?? data
    },
    refetchInterval: 30_000, // poll every 30s
  })
}

function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-header'] }),
  })
}

function useMarkOneRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-header'] }),
  })
}

const NOTIF_ICONS: Record<string, string> = {
  visitor_arrived: '🚪',
  payment_due: '💰',
  payment_confirmed: '✅',
  reservation_confirmed: '📅',
  work_order: '🔧',
  announcement: '📢',
}

const NOTIF_LINKS: Record<string, string> = {
  visitor_arrived: '/dashboard/visitors',
  payment_due: '/dashboard/payments',
  payment_confirmed: '/dashboard/payments',
  reservation_confirmed: '/dashboard/reservations',
  work_order: '/dashboard/workorders',
  announcement: '/dashboard/forum',
}

export function Header() {
  const { user } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const { data: notifData } = useNotifications()
  const markAllRead = useMarkAllRead()
  const markOneRead = useMarkOneRead()

  const notifications = notifData?.notifications ?? []
  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="text-sm text-gray-500">
        Bienvenido, <span className="font-medium text-gray-900">{user?.firstName}</span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <span className="text-xs px-2 py-1 bg-brand-50 text-brand-700 rounded-full font-medium">
          {user?.role ? ROLE_LABEL[user.role] : ''}
        </span>

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      title="Marcar todas como leídas"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Leer todas
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} className="p-0.5 text-gray-400 hover:text-gray-600 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-sm">
                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    Sin notificaciones
                  </div>
                )}
                {notifications.map((n: any) => {
                  const href = NOTIF_LINKS[n.type] ?? '/dashboard/notifications'
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => { setShowNotifs(false); if (!n.isRead) markOneRead.mutate(n.id) }}
                      className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                          {NOTIF_ICONS[n.type] ?? '🔔'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                <Link href="/dashboard/notifications" onClick={() => setShowNotifs(false)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Ver todas las notificaciones →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-semibold text-white overflow-hidden">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
          }
        </div>
      </div>
    </header>
  )
}

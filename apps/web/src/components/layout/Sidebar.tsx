'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useAllCommunities } from '@/hooks/useCommunity'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Home, CreditCard, Calendar,
  MapPin, UserCog, ClipboardList, QrCode, DoorOpen,
  ShieldCheck, BarChart3, Settings, LogOut, Shield, Building2,
  MessageSquare, ChevronDown, Bell, CheckSquare,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/residents', label: 'Residentes', icon: Users },
  { href: '/dashboard/units', label: 'Unidades', icon: Home },
  { href: '/dashboard/payments', label: 'Pagos', icon: CreditCard },
  { href: '/dashboard/reservations', label: 'Reservaciones', icon: Calendar },
  { href: '/dashboard/areas', label: 'Áreas Comunes', icon: MapPin },
  { href: '/dashboard/staff', label: 'Personal', icon: UserCog },
  { href: '/dashboard/workorders', label: 'Órdenes de trabajo', icon: ClipboardList },
  { href: '/dashboard/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/dashboard/visitors', label: 'Visitantes', icon: QrCode },
  { href: '/dashboard/gate', label: 'Control de acceso', icon: DoorOpen },
  { href: '/dashboard/verifications', label: 'Verificaciones', icon: ShieldCheck },
  { href: '/dashboard/forum', label: 'Foro', icon: MessageSquare },
  { href: '/dashboard/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/dashboard/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

const superAdminItems = [
  { href: '/dashboard/communities', label: 'Comunidades', icon: Building2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout, activeCommunityId, activeCommunityIds, setActiveCommunity, setActiveCommunityIds, setAuth } = useAuthStore()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isCommunityAdmin = user?.role === 'COMMUNITY_ADMIN' || user?.role === 'MANAGER' || user?.communityRole === 'COMMUNITY_ADMIN' || user?.communityRole === 'MANAGER'
  const [showCommunityPicker, setShowCommunityPicker] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const { data: allCommunities } = useAllCommunities()

  async function handleClaimSuperAdmin() {
    setClaiming(true)
    try {
      const { data } = await api.post('/auth/claim-super-admin')
      setAuth(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken })
      window.location.reload()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo reclamar el acceso')
    } finally {
      setClaiming(false)
    }
  }

  // For non-SUPER_ADMIN, use communities from user object
  const userCommunities: { id: string; name: string }[] = isSuperAdmin
    ? (allCommunities ?? [])
    : (user?.communities ?? [])
  const activeCommunity = userCommunities.find((c) => c.id === activeCommunityId)
  const showSwitcher = userCommunities.length > 1

  // SUPER_ADMIN: auto-select all communities on first load
  useEffect(() => {
    if (isSuperAdmin && allCommunities && allCommunities.length > 0) {
      const allIds = allCommunities.map((c: any) => c.id)
      const hasUnselected = allIds.some((id: string) => !activeCommunityIds.includes(id))
      // Only auto-select if user hasn't manually deselected (activeCommunityIds ≤ 1 means initial state)
      if (hasUnselected && activeCommunityIds.length <= 1) {
        setActiveCommunityIds(allIds)
      }
    }
  }, [allCommunities, isSuperAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCommunity = (id: string) => {
    const alreadySelected = activeCommunityIds.includes(id)
    if (alreadySelected && activeCommunityIds.length === 1) return // keep at least one
    const newIds = alreadySelected
      ? activeCommunityIds.filter((x) => x !== id)
      : [...activeCommunityIds, id]
    setActiveCommunityIds(newIds)
  }

  const selectAll = () => setActiveCommunityIds(userCommunities.map((c) => c.id))
  const isAllSelected = userCommunities.every((c) => activeCommunityIds.includes(c.id))

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      {/* Brand + Community Switcher */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none">Chamanes</p>
            <p className="text-gray-400 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
        {showSwitcher && (
          <div className="relative">
            <button
              onClick={() => setShowCommunityPicker((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span className="text-gray-200 truncate text-xs">
                  {isAllSelected
                    ? 'Todos los complejos'
                    : activeCommunityIds.length > 1
                      ? `${activeCommunityIds.length} complejos`
                      : activeCommunity?.name ?? 'Seleccionar'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${showCommunityPicker ? 'rotate-180' : ''}`} />
            </button>
            {showCommunityPicker && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
                {/* Select all */}
                <button
                  onClick={selectAll}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-gray-700 hover:bg-gray-700 transition-colors flex items-center gap-2 ${isAllSelected ? 'text-brand-400 font-semibold' : 'text-gray-400'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${isAllSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-500'}`}>
                    {isAllSelected && <span className="text-white text-[8px] leading-none">✓</span>}
                  </span>
                  Todos los complejos
                </button>
                {userCommunities.map((c) => {
                  const checked = activeCommunityIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCommunity(c.id)}
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-300"
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${checked ? 'bg-brand-500 border-brand-500' : 'border-gray-500'}`}>
                        {checked && <span className="text-white text-[8px] leading-none">✓</span>}
                      </span>
                      <span className={`truncate ${checked ? 'text-brand-300 font-semibold' : ''}`}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {(isSuperAdmin || isCommunityAdmin) && (
          <>
            <p className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isSuperAdmin ? 'Super Admin' : 'Administración'}
            </p>
            {superAdminItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
            {!isSuperAdmin && (
              <button
                onClick={handleClaimSuperAdmin}
                disabled={claiming}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-purple-400 hover:text-white hover:bg-purple-900/40 transition-colors"
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                {claiming ? 'Verificando...' : 'Reclamar Super Admin'}
              </button>
            )}
            <div className="border-t border-gray-800 my-3" />
          </>
        )}
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="text-xs">{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); window.location.href = '/login' }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

function NavLink({ item, pathname }: { item: typeof navItems[0]; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-brand-600 text-white font-medium'
          : 'text-gray-400 hover:text-white hover:bg-gray-800',
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
    </Link>
  )
}

'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { formatDate, fullName, PRIORITY_COLOR, PRIORITY_LABEL, ROLE_LABEL } from '@/lib/utils'
import { Plus, X, CheckCircle2, Clock, AlertCircle, Trash2, Edit2 } from 'lucide-react'

const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
}

const TASK_STATUS_COLOR: Record<string, string> = {
  PENDING:     'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED:   'bg-green-100 text-green-800',
  CANCELLED:   'bg-gray-100 text-gray-600',
}

const TASK_STATUS_ICON: Record<string, any> = {
  PENDING:     Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED:   CheckCircle2,
  CANCELLED:   X,
}

const TABS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const

function useTasks(status: string) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])
  return useQuery({
    queryKey: ['tasks', ids, status],
    queryFn: async () => {
      const param = status !== 'ALL' ? `?status=${status}` : ''
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/tasks${param}`)
        return data.tasks ?? []
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/tasks${param}`).then((r) => ({ communityId: id, tasks: r.data.tasks ?? [] })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => r.tasks.map((t: any) => ({ ...t, _communityId: r.communityId })))
      merged.sort((a: any, b: any) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      return merged
    },
    enabled: ids.length > 0,
  })
}

function useCreateTask() {
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const communityId = activeCommunityId ?? activeCommunityIds[0]
  return useMutation({
    mutationFn: (body: object) => api.post(`/communities/${communityId}/tasks`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

function useUpdateTask() {
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const fallback = activeCommunityId ?? activeCommunityIds[0]
  return useMutation({
    mutationFn: ({ taskId, communityId, body }: { taskId: string; communityId?: string; body: object }) =>
      api.patch(`/communities/${communityId ?? fallback}/tasks/${taskId}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

function useDeleteTask() {
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const fallback = activeCommunityId ?? activeCommunityIds[0]
  return useMutation({
    mutationFn: ({ taskId, communityId }: { taskId: string; communityId?: string }) =>
      api.delete(`/communities/${communityId ?? fallback}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

function useAssignableUsers() {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const id = activeCommunityId ?? activeCommunityIds[0]
  return useQuery({
    queryKey: ['assignable-users', id],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${id}/tasks/assignable-users`)
      return data.users ?? []
    },
    enabled: !!id,
    staleTime: 60_000,
  })
}

function isDueSoon(dueDate?: string | null) {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const diff = due.getTime() - Date.now()
  return diff > 0 && diff < 24 * 3600_000
}

function isOverdue(dueDate?: string | null, status?: string) {
  if (!dueDate || status === 'COMPLETED' || status === 'CANCELLED') return false
  return new Date(dueDate) < new Date()
}

export default function TasksPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const { data: tasks, isLoading } = useTasks(tab)
  const { data: assignableData } = useAssignableUsers()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { user, activeCommunityIds } = useAuthStore()
  const communityMap = Object.fromEntries((user?.communities ?? []).map((c: any) => [c.id, c.name]))
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.communityRole === 'COMMUNITY_ADMIN' || user?.role === 'COMMUNITY_ADMIN' || user?.communityRole === 'MANAGER'
  const staff: any[] = assignableData ?? []

  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
  const [formError, setFormError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setFormError('')
    try {
      await createTask.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate || undefined,
      })
      setForm({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
      setShowCreate(false)
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Error al crear la tarea')
    }
  }

  const handleStatusChange = async (task: any, newStatus: string) => {
    await updateTask.mutateAsync({ taskId: task.id, communityId: task._communityId ?? task.communityId, body: { status: newStatus } })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-gray-500 text-sm">Gestión de tareas y seguimiento</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'ALL' ? 'Todas' : TASK_STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Nueva tarea</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <input className="input" placeholder="Título de la tarea..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className="input" rows={2} placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prioridad</label>
                <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fecha límite</label>
                <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            {staff.length > 0 && (
              <div>
                <label className="label">Asignar a</label>
                <select className="input" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {staff.map((s: any) => <option key={s.id} value={s.id}>{fullName(s)} — {ROLE_LABEL[s.communityRole] ?? s.communityRole}</option>)}
                </select>
              </div>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={createTask.isPending || !form.title.trim()} className="btn-primary flex-1">
                {createTask.isPending ? 'Creando...' : 'Crear tarea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card p-4 h-20 animate-pulse bg-gray-100" />)}</div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No hay tareas {tab !== 'ALL' ? TASK_STATUS_LABEL[tab].toLowerCase() + 's' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => {
            const StatusIcon = TASK_STATUS_ICON[task.status] ?? Clock
            const overdue = isOverdue(task.dueDate, task.status)
            const dueSoon = isDueSoon(task.dueDate)
            return (
              <div key={task.id} className={`card p-4 ${overdue ? 'border-red-200 bg-red-50/30' : dueSoon ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Status toggle */}
                  <button
                    onClick={() => {
                      if (task.status === 'PENDING') handleStatusChange(task, 'IN_PROGRESS')
                      else if (task.status === 'IN_PROGRESS') handleStatusChange(task, 'COMPLETED')
                    }}
                    className="mt-0.5 flex-shrink-0"
                    title={task.status === 'COMPLETED' ? 'Completada' : 'Cambiar estado'}
                    disabled={task.status === 'COMPLETED' || task.status === 'CANCELLED'}
                  >
                    <StatusIcon className={`w-5 h-5 ${task.status === 'COMPLETED' ? 'text-green-500' : task.status === 'IN_PROGRESS' ? 'text-blue-500' : 'text-gray-300'}`} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`font-medium text-sm ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-xs ${TASK_STATUS_COLOR[task.status]}`}>
                          {TASK_STATUS_LABEL[task.status]}
                        </span>
                        <span className={`badge text-xs ${PRIORITY_COLOR[task.priority]}`}>
                          {PRIORITY_LABEL[task.priority]}
                        </span>
                        {task._communityId && activeCommunityIds.length > 1 && (
                          <span className="text-xs bg-brand-50 text-brand-600 border border-brand-100 px-2 py-0.5 rounded-full font-medium">
                            {communityMap[task._communityId] ?? 'Comunidad'}
                          </span>
                        )}
                      </div>
                    </div>

                    {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}

                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-400">
                      {task.assignee && (
                        <span>👤 {fullName(task.assignee)}</span>
                      )}
                      {task.dueDate && (
                        <span className={overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-600 font-medium' : ''}>
                          {overdue ? '⚠️ Vencida: ' : dueSoon ? '⏰ Vence: ' : '📅 Límite: '}
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.completedAt && <span>✓ {formatDate(task.completedAt)}</span>}
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
                      >
                        {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                          <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { if (confirm('¿Eliminar esta tarea?')) deleteTask.mutate({ taskId: task.id, communityId: task._communityId ?? task.communityId }) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

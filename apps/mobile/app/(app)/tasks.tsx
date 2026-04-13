import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../src/hooks/useTasks'
import { useAuthStore } from '../../src/stores/auth.store'
import { useStaffList } from '../../src/hooks/useStaff'
import type { Task, TaskStatus } from '../../src/services/task.service'
import { format, isPast, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: string }> = {
  PENDING:     { label: 'Pendiente',   color: '#F59E0B', icon: 'time-outline' },
  IN_PROGRESS: { label: 'En progreso', color: '#3B82F6', icon: 'reload-circle-outline' },
  COMPLETED:   { label: 'Completada',  color: '#10B981', icon: 'checkmark-circle-outline' },
  CANCELLED:   { label: 'Cancelada',   color: '#64748B', icon: 'close-circle-outline' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW:    { label: 'Baja',      color: '#64748B' },
  MEDIUM: { label: 'Media',     color: '#F59E0B' },
  HIGH:   { label: 'Alta',      color: '#F97316' },
  URGENT: { label: '🚨 Urgente', color: '#EF4444' },
}

const FILTERS: { label: string; value: string }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'En progreso', value: 'IN_PROGRESS' },
  { label: 'Completadas', value: 'COMPLETED' },
]

function formatDueDate(dueDate: string | null | undefined, status: TaskStatus) {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const overdue = isPast(due) && status !== 'COMPLETED' && status !== 'CANCELLED'
  const hoursLeft = differenceInHours(due, new Date())
  if (overdue) return { text: `Vencida ${format(due, "d MMM", { locale: es })}`, color: '#EF4444', urgent: true }
  if (hoursLeft <= 24 && hoursLeft > 0) return { text: `Vence en ${hoursLeft}h`, color: '#F59E0B', urgent: true }
  return { text: `Límite: ${format(due, "d MMM", { locale: es })}`, color: '#64748B', urgent: false }
}

export default function TasksScreen() {
  const user = useAuthStore((s) => s.user)
  const communityId = user?.communityId ?? ''
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.communityRole === 'COMMUNITY_ADMIN' || user?.communityRole === 'MANAGER' || user?.role === 'COMMUNITY_ADMIN'

  const [filter, setFilter] = useState('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' })

  const { data, isLoading, isFetching, refetch } = useTasks(filter !== 'ALL' ? filter : undefined)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: staffData } = useStaffList()
  const staff: any[] = (staffData as any)?.staff ?? staffData ?? []

  const tasks: Task[] = data?.tasks ?? []

  async function handleCreate() {
    if (!form.title.trim()) return Alert.alert('Error', 'El título es requerido')
    try {
      await createTask.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority as any,
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate || undefined,
      })
      setForm({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
      setShowCreate(false)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo crear la tarea')
    }
  }

  function handleStatusCycle(task: Task) {
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return
    const next: Record<TaskStatus, TaskStatus | null> = {
      PENDING: 'IN_PROGRESS',
      IN_PROGRESS: 'COMPLETED',
      COMPLETED: null,
      CANCELLED: null,
    }
    const nextStatus = next[task.status]
    if (!nextStatus) return
    Alert.alert(
      'Actualizar estado',
      `¿Cambiar a "${STATUS_CONFIG[nextStatus].label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => updateTask.mutate({ taskId: task.id, data: { status: nextStatus } }) },
      ]
    )
  }

  function handleDelete(task: Task) {
    Alert.alert('Eliminar tarea', `¿Eliminar "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteTask.mutate(task.id) },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Tareas</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={() => setShowCreate(true)}
            style={{ backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Nueva</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8, flexDirection: 'row' }}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.value} onPress={() => setFilter(f.value)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === f.value ? '#3B82F6' : '#1E293B', borderWidth: 1, borderColor: filter === f.value ? '#3B82F6' : '#334155' }}>
            <Text style={{ color: filter === f.value ? 'white' : '#94A3B8', fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task list */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#3B82F6" />}
        >
          {tasks.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#334155" />
              <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12 }}>Sin tareas</Text>
            </View>
          ) : tasks.map((task) => {
            const cfg = STATUS_CONFIG[task.status]
            const pri = PRIORITY_CONFIG[task.priority]
            const dueInfo = formatDueDate(task.dueDate, task.status)
            const canAdvance = task.status === 'PENDING' || task.status === 'IN_PROGRESS'
            return (
              <View key={task.id} style={{
                backgroundColor: dueInfo?.urgent ? '#1E1A0F' : '#1E293B',
                borderRadius: 16, padding: 16,
                borderWidth: 1,
                borderColor: dueInfo?.urgent ? '#78350F' : '#334155',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {/* Status icon */}
                  <TouchableOpacity onPress={() => handleStatusCycle(task)} disabled={!canAdvance} style={{ marginTop: 2 }}>
                    <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: task.status === 'COMPLETED' ? '#475569' : 'white', fontWeight: '600', fontSize: 15, textDecorationLine: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                      {task.title}
                    </Text>
                    {task.description && <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{task.description}</Text>}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${cfg.color}20` }}>
                        <Text style={{ color: cfg.color, fontSize: 11, fontWeight: '700' }}>{cfg.label}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#0F172A' }}>
                        <Text style={{ color: pri.color, fontSize: 11, fontWeight: '700' }}>{pri.label}</Text>
                      </View>
                    </View>

                    {task.assignee && (
                      <Text style={{ color: '#64748B', fontSize: 12, marginTop: 6 }}>
                        👤 {task.assignee.firstName} {task.assignee.lastName}
                      </Text>
                    )}
                    {dueInfo && (
                      <Text style={{ color: dueInfo.color, fontSize: 12, marginTop: 4, fontWeight: dueInfo.urgent ? '700' : '400' }}>
                        {dueInfo.text}
                      </Text>
                    )}
                  </View>

                  {isAdmin && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                    <TouchableOpacity onPress={() => handleDelete(task)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Create Task Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Nueva tarea</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Título *</Text>
            <TextInput value={form.title} onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
              placeholder="Título de la tarea" placeholderTextColor="#475569"
              style={{ backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 15, marginBottom: 14 }} />

            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Descripción</Text>
            <TextInput value={form.description} onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
              placeholder="Descripción opcional" placeholderTextColor="#475569" multiline numberOfLines={3}
              style={{ backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 15, marginBottom: 14, textAlignVertical: 'top' }} />

            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Prioridad</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <TouchableOpacity key={key} onPress={() => setForm(f => ({ ...f, priority: key }))}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: form.priority === key ? cfg.color : '#334155', backgroundColor: form.priority === key ? `${cfg.color}20` : '#1E293B' }}>
                  <Text style={{ color: form.priority === key ? cfg.color : '#64748B', fontSize: 11, fontWeight: '700' }}>{cfg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Fecha límite (YYYY-MM-DD)</Text>
            <TextInput value={form.dueDate} onChangeText={(v) => setForm(f => ({ ...f, dueDate: v }))}
              placeholder="2026-04-30" placeholderTextColor="#475569"
              style={{ backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 15, marginBottom: 14 }} />

            {staff.length > 0 && (
              <>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10 }}>Asignar a (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                  <TouchableOpacity onPress={() => setForm(f => ({ ...f, assigneeId: '' }))}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: !form.assigneeId ? '#3B82F6' : '#334155', backgroundColor: !form.assigneeId ? '#3B82F620' : '#1E293B' }}>
                    <Text style={{ color: !form.assigneeId ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>Sin asignar</Text>
                  </TouchableOpacity>
                  {staff.map((s: any) => (
                    <TouchableOpacity key={s.id} onPress={() => setForm(f => ({ ...f, assigneeId: s.user?.id ?? s.id }))}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: form.assigneeId === (s.user?.id ?? s.id) ? '#3B82F6' : '#334155', backgroundColor: form.assigneeId === (s.user?.id ?? s.id) ? '#3B82F620' : '#1E293B' }}>
                      <Text style={{ color: form.assigneeId === (s.user?.id ?? s.id) ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>
                        {s.user?.firstName} {s.user?.lastName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </ScrollView>
          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
            <TouchableOpacity onPress={handleCreate} disabled={createTask.isPending || !form.title.trim()}
              style={{ backgroundColor: form.title.trim() ? '#3B82F6' : '#1E293B', borderRadius: 14, padding: 16, alignItems: 'center' }}>
              {createTask.isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: form.title.trim() ? 'white' : '#475569', fontWeight: '700', fontSize: 16 }}>Crear tarea</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

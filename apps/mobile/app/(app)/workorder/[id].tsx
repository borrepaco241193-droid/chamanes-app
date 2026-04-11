import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  useWorkOrder,
  useUpdateWorkOrderStatus,
  useAddComment,
  useStaffList,
  useAssignWorkOrder,
} from '../../../src/hooks/useWorkOrders'
import { useAuthStore } from '../../../src/stores/auth.store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { WorkOrderStatus } from '../../../src/services/workorder.service'
import type { StaffMember } from '../../../src/services/staff.service'

// ── Config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; bg: string; text: string; icon: string }> = {
  OPEN:        { label: 'Abierta',     bg: 'bg-blue-500/20',    text: 'text-blue-400',    icon: 'radio-button-on-outline' },
  ASSIGNED:    { label: 'Asignada',    bg: 'bg-violet-500/20',  text: 'text-violet-400',  icon: 'person-outline' },
  IN_PROGRESS: { label: 'En progreso', bg: 'bg-amber-500/20',   text: 'text-amber-400',   icon: 'sync-outline' },
  COMPLETED:   { label: 'Completada',  bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: 'checkmark-circle-outline' },
  CANCELLED:   { label: 'Cancelada',   bg: 'bg-slate-500/20',   text: 'text-slate-400',   icon: 'close-circle-outline' },
}

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgente', color: '#EF4444' },
  HIGH:   { label: 'Alto',    color: '#F97316' },
  MEDIUM: { label: 'Medio',   color: '#F59E0B' },
  LOW:    { label: 'Bajo',    color: '#64748B' },
}

const CATEGORY_ICONS: Record<string, string> = {
  maintenance: 'construct-outline',
  cleaning:    'sparkles-outline',
  security:    'shield-outline',
  other:       'ellipsis-horizontal-outline',
}

// ── Info Row ──────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3 border-b border-surface-border">
      <Ionicons name={icon as any} size={16} color="#64748B" style={{ width: 24 }} />
      <Text className="text-surface-muted text-sm w-28">{label}</Text>
      <Text className="text-white text-sm flex-1">{value}</Text>
    </View>
  )
}

// ── Comment Bubble ────────────────────────────────────────────

function CommentBubble({ body, createdAt, isOwn }: { body: string; createdAt: string; isOwn: boolean }) {
  return (
    <View className={`mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isOwn ? 'bg-primary-500' : 'bg-surface-card border border-surface-border'
        }`}
      >
        <Text className="text-white text-sm">{body}</Text>
      </View>
      <Text className="text-surface-muted text-xs mt-1 px-1">
        {format(new Date(createdAt), "d MMM · HH:mm", { locale: es })}
      </Text>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: order, isLoading } = useWorkOrder(id)
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateWorkOrderStatus()
  const { mutateAsync: addComment, isPending: isCommenting } = useAddComment()
  const { mutateAsync: assignOrder, isPending: isAssigning } = useAssignWorkOrder()
  const { data: staffList } = useStaffList()
  const user = useAuthStore((s) => s.user)

  const [commentText, setCommentText] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)

  const isAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER' ||
    user?.communityRole === 'SUPER_ADMIN'
  const isStaff = user?.communityRole === 'STAFF'
  const canUpdateStatus = isAdmin || isStaff

  async function handleAssign(staff: StaffMember) {
    setShowAssignModal(false)
    try {
      await assignOrder({ orderId: id, staffId: staff.id })
      Alert.alert(
        'Asignado',
        `Orden asignada a ${(staff as any).user?.firstName ?? 'personal'}. Se le envió una notificación.`,
      )
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo asignar la orden.')
    }
  }

  async function handleStatusChange(newStatus: WorkOrderStatus) {
    const labels: Record<string, string> = {
      IN_PROGRESS: '¿Marcar como en progreso?',
      COMPLETED:   '¿Marcar como completada?',
      CANCELLED:   '¿Cancelar esta orden de trabajo?',
    }
    Alert.alert(
      labels[newStatus] ?? 'Actualizar estado',
      undefined,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'CANCELLED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateStatus({ orderId: id, status: newStatus })
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo actualizar el estado.')
            }
          },
        },
      ],
    )
  }

  async function handleAddComment() {
    const body = commentText.trim()
    if (!body) return
    try {
      await addComment({ orderId: id, body })
      setCommentText('')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo agregar el comentario.')
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#334155" />
        <Text className="text-white font-bold mt-3">Orden no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-400">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.OPEN
  const priority = PRIORITY_CONFIG[order.priority] ?? PRIORITY_CONFIG.MEDIUM
  const categoryIcon = CATEGORY_ICONS[order.category] ?? 'construct-outline'
  const isActive = order.status !== 'COMPLETED' && order.status !== 'CANCELLED'

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface-card items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>
            Orden de trabajo
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Title + badges */}
          <View className="px-6 mb-4">
            <Text className="text-white text-xl font-bold mb-3">{order.title}</Text>
            <View className="flex-row gap-2 flex-wrap">
              <View className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${status.bg}`}>
                <Ionicons name={status.icon as any} size={13} color="" className={status.text} />
                <Text className={`text-xs font-semibold ${status.text}`}>{status.label}</Text>
              </View>
              <View
                className="flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ backgroundColor: `${priority.color}20` }}
              >
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: priority.color }} />
                <Text className="text-xs font-semibold" style={{ color: priority.color }}>
                  {priority.label}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card border border-surface-border">
                <Ionicons name={categoryIcon as any} size={13} color="#64748B" />
                <Text className="text-surface-muted text-xs capitalize">{order.category}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mx-6 bg-surface-card border border-surface-border rounded-2xl p-4 mb-4">
            <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-2">Descripción</Text>
            <Text className="text-white text-sm leading-relaxed">{order.description}</Text>
          </View>

          {/* Details */}
          <View className="mx-6 bg-surface-card border border-surface-border rounded-2xl px-4 mb-4">
            {order.location && (
              <InfoRow icon="location-outline" label="Ubicación" value={order.location} />
            )}
            <InfoRow
              icon="calendar-outline"
              label="Reportada"
              value={format(new Date(order.createdAt), "d 'de' MMMM yyyy", { locale: es })}
            />
            {order.dueDate && (
              <InfoRow
                icon="time-outline"
                label="Fecha límite"
                value={format(new Date(order.dueDate), "d 'de' MMMM yyyy", { locale: es })}
              />
            )}
            {order.completedAt && (
              <InfoRow
                icon="checkmark-circle-outline"
                label="Completada"
                value={format(new Date(order.completedAt), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
              />
            )}
            {order.assignments && order.assignments.length > 0 && (
              <InfoRow
                icon="person-outline"
                label="Asignada a"
                value={order.assignments.map((a: any) =>
                  a.staff?.user ? `${a.staff.user.firstName} ${a.staff.user.lastName}` : a.staff?.position ?? 'Personal'
                ).join(', ')}
              />
            )}
          </View>

          {/* Assign section — admin/manager only */}
          {isAdmin && isActive && (
            <View className="mx-6 mb-4">
              <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-2">
                Asignación
              </Text>
              <TouchableOpacity
                onPress={() => setShowAssignModal(true)}
                disabled={isAssigning}
                className="flex-row items-center gap-2 bg-violet-500/20 border border-violet-500/40 px-4 py-3 rounded-xl"
                activeOpacity={0.75}
              >
                <Ionicons name="person-add-outline" size={18} color="#8B5CF6" />
                <Text className="text-violet-400 font-medium text-sm flex-1">
                  {order.assignments && order.assignments.length > 0
                    ? 'Reasignar a otro técnico'
                    : 'Asignar a técnico / personal'}
                </Text>
                {isAssigning && <ActivityIndicator size="small" color="#8B5CF6" />}
              </TouchableOpacity>
            </View>
          )}

          {/* Status actions */}
          {canUpdateStatus && isActive && (
            <View className="mx-6 mb-4">
              <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-2">
                Cambiar estado
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {order.status === 'OPEN' || order.status === 'ASSIGNED' ? (
                  <TouchableOpacity
                    onPress={() => handleStatusChange('IN_PROGRESS')}
                    disabled={isUpdating}
                    className="flex-row items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-4 py-2.5 rounded-xl"
                    activeOpacity={0.75}
                  >
                    <Ionicons name="sync-outline" size={16} color="#F59E0B" />
                    <Text className="text-amber-400 font-medium text-sm">Iniciar trabajo</Text>
                  </TouchableOpacity>
                ) : null}

                {order.status === 'IN_PROGRESS' && (
                  <TouchableOpacity
                    onPress={() => handleStatusChange('COMPLETED')}
                    disabled={isUpdating}
                    className="flex-row items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-4 py-2.5 rounded-xl"
                    activeOpacity={0.75}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                    <Text className="text-emerald-400 font-medium text-sm">Marcar completada</Text>
                  </TouchableOpacity>
                )}

                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => handleStatusChange('CANCELLED')}
                    disabled={isUpdating}
                    className="flex-row items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-xl"
                    activeOpacity={0.75}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text className="text-red-400 font-medium text-sm">Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isUpdating && (
                <View className="flex-row items-center gap-2 mt-2">
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className="text-surface-muted text-xs">Actualizando...</Text>
                </View>
              )}
            </View>
          )}

          {/* Comments */}
          <View className="px-6 mb-4">
            <Text className="text-white font-semibold mb-3">
              Comentarios {order.comments && order.comments.length > 0 && `(${order.comments.length})`}
            </Text>

            {order.comments && order.comments.length > 0 ? (
              order.comments.map((c) => (
                <CommentBubble
                  key={c.id}
                  body={c.body}
                  createdAt={c.createdAt}
                  isOwn={c.authorId === user?.id}
                />
              ))
            ) : (
              <Text className="text-surface-muted text-sm">Sin comentarios aún.</Text>
            )}
          </View>

          <View className="h-4" />
        </ScrollView>

        {/* Assign Modal */}
        <Modal
          visible={showAssignModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAssignModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
              {/* Modal header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', flex: 1 }}>
                  Seleccionar personal
                </Text>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {!staffList || staffList.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={40} color="#334155" />
                  <Text style={{ color: '#64748B', marginTop: 12 }}>No hay personal registrado</Text>
                </View>
              ) : (
                <FlatList
                  data={staffList}
                  keyExtractor={(s) => s.id}
                  contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item: s }) => {
                    const name = (s as any).user
                      ? `${(s as any).user.firstName} ${(s as any).user.lastName}`
                      : s.position
                    const isOnShift = s.checkIns && s.checkIns.length > 0
                    const isCurrentlyAssigned = order?.assignments?.some((a: any) => a.staffId === s.id)
                    return (
                      <TouchableOpacity
                        onPress={() => handleAssign(s)}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isCurrentlyAssigned ? '#1E3A5F' : '#0F172A',
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: isCurrentlyAssigned ? '#3B82F6' : '#334155',
                          gap: 12,
                        }}
                      >
                        <View style={{
                          width: 42, height: 42, borderRadius: 21,
                          backgroundColor: '#334155',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                            {name[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{name}</Text>
                          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{s.position}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          {isOnShift && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
                              <Text style={{ color: '#22C55E', fontSize: 11 }}>En turno</Text>
                            </View>
                          )}
                          {isCurrentlyAssigned && (
                            <Text style={{ color: '#3B82F6', fontSize: 11 }}>Asignado</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )
                  }}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Add comment input */}
        <View className="px-6 pb-6 pt-3 border-t border-surface-border flex-row items-end gap-3">
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Agregar un comentario..."
            placeholderTextColor="#475569"
            multiline
            maxLength={1000}
            className="flex-1 bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-sm max-h-24"
          />
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={isCommenting || !commentText.trim()}
            className={`w-11 h-11 rounded-xl items-center justify-center ${
              commentText.trim() ? 'bg-primary-500' : 'bg-surface-card'
            }`}
            activeOpacity={0.8}
          >
            {isCommenting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={commentText.trim() ? 'white' : '#475569'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

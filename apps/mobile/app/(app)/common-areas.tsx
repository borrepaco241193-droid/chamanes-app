import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Switch, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationService, type CommonArea } from '../../src/services/reservation.service'
import { useAuthStore } from '../../src/stores/auth.store'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

// ── Area Form Modal ───────────────────────────────────────────

interface AreaForm {
  name: string
  description: string
  capacity: string
  openTime: string
  closeTime: string
  requiresApproval: boolean
  feeAmount: string
}

const EMPTY_FORM: AreaForm = {
  name: '', description: '', capacity: '',
  openTime: '08:00', closeTime: '22:00',
  requiresApproval: false, feeAmount: '0',
}

function areaToForm(area: CommonArea): AreaForm {
  return {
    name: area.name,
    description: area.description ?? '',
    capacity: area.capacity ? String(area.capacity) : '',
    openTime: area.openTime ?? '08:00',
    closeTime: area.closeTime ?? '22:00',
    requiresApproval: area.requiresApproval,
    feeAmount: area.feeAmount ? String(area.feeAmount) : '0',
  }
}

function AreaFormModal({ visible, area, onClose, onSave, isSaving }: {
  visible: boolean
  area: CommonArea | null
  onClose: () => void
  onSave: (data: AreaForm) => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<AreaForm>(area ? areaToForm(area) : EMPTY_FORM)
  const isEdit = !!area

  // Reset when modal opens
  useState(() => {
    setForm(area ? areaToForm(area) : EMPTY_FORM)
  })

  function set(key: keyof AreaForm, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleOpen() {
    setForm(area ? areaToForm(area) : EMPTY_FORM)
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B', gap: 12 }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', flex: 1 }}>
            {isEdit ? 'Editar área' : 'Nueva área común'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (!form.name.trim()) return Alert.alert('Error', 'El nombre es requerido')
              onSave(form)
            }}
            disabled={isSaving}
            style={{ backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={{ color: 'white', fontWeight: '700' }}>Guardar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>NOMBRE *</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Ej: Alberca, Salón de Fiestas..."
              placeholderTextColor="#475569"
              style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: 'white', borderWidth: 1, borderColor: '#334155' }}
            />
          </View>

          {/* Description */}
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>DESCRIPCIÓN</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => set('description', v)}
              placeholder="Descripción del área..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={3}
              style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: 'white', borderWidth: 1, borderColor: '#334155', minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          {/* Capacity + Fee */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>CAPACIDAD</Text>
              <TextInput
                value={form.capacity}
                onChangeText={(v) => set('capacity', v)}
                placeholder="Máx personas"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: 'white', borderWidth: 1, borderColor: '#334155' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>CUOTA ($)</Text>
              <TextInput
                value={form.feeAmount}
                onChangeText={(v) => set('feeAmount', v)}
                placeholder="0"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: 'white', borderWidth: 1, borderColor: '#334155' }}
              />
            </View>
          </View>

          {/* Hours */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>HORA APERTURA</Text>
              <TextInput
                value={form.openTime}
                onChangeText={(v) => set('openTime', v)}
                placeholder="08:00"
                placeholderTextColor="#475569"
                style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: 'white', borderWidth: 1, borderColor: '#334155' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>HORA CIERRE</Text>
              <TextInput
                value={form.closeTime}
                onChangeText={(v) => set('closeTime', v)}
                placeholder="22:00"
                placeholderTextColor="#475569"
                style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: 'white', borderWidth: 1, borderColor: '#334155' }}
              />
            </View>
          </View>

          {/* Requires approval toggle */}
          <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Requiere aprobación</Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>El admin debe aprobar cada reservación</Text>
            </View>
            <Switch
              value={form.requiresApproval}
              onValueChange={(v) => set('requiresApproval', v)}
              trackColor={{ false: '#334155', true: '#3B82F6' }}
              thumbColor="white"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Area Card ─────────────────────────────────────────────────

function AreaCard({ area, onEdit, onDelete }: {
  area: CommonArea
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <View style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="business-outline" size={22} color="#3B82F6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{area.name}</Text>
          {area.description ? (
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{area.description}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {area.capacity ? (
              <View style={{ backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="people-outline" size={12} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>Máx {area.capacity}</Text>
              </View>
            ) : null}
            {area.openTime && area.closeTime ? (
              <View style={{ backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>{area.openTime}–{area.closeTime}</Text>
              </View>
            ) : null}
            {area.feeAmount > 0 ? (
              <View style={{ backgroundColor: '#10B98115', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#10B981', fontSize: 11 }}>${area.feeAmount} cuota</Text>
              </View>
            ) : null}
            {area.requiresApproval ? (
              <View style={{ backgroundColor: '#F59E0B15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#F59E0B', fontSize: 11 }}>Requiere aprobación</Text>
              </View>
            ) : null}
          </View>
        </View>
        {/* Actions */}
        <View style={{ gap: 8 }}>
          <TouchableOpacity onPress={onEdit} style={{ backgroundColor: '#3B82F620', borderRadius: 8, padding: 8 }}>
            <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={{ backgroundColor: '#EF444420', borderRadius: 8, padding: 8 }}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function CommonAreasScreen() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingArea, setEditingArea] = useState<CommonArea | null>(null)

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['common-areas', communityId],
    queryFn: () => reservationService.listAreas(communityId),
    enabled: !!communityId,
  })

  const { mutateAsync: createArea, isPending: isCreating } = useMutation({
    mutationFn: (data: Partial<CommonArea>) => reservationService.createArea(communityId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['common-areas', communityId] }),
  })

  const { mutateAsync: updateArea, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommonArea> }) =>
      reservationService.updateArea(communityId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['common-areas', communityId] }),
  })

  const { mutateAsync: deleteArea } = useMutation({
    mutationFn: (id: string) => reservationService.deleteArea(communityId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['common-areas', communityId] }),
  })

  async function handleSave(form: AreaForm) {
    const data: Partial<CommonArea> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      openTime: form.openTime,
      closeTime: form.closeTime,
      requiresApproval: form.requiresApproval,
      feeAmount: Number(form.feeAmount) || 0,
    }
    try {
      if (editingArea) {
        await updateArea({ id: editingArea.id, data })
        Alert.alert('Listo', 'Área actualizada correctamente')
      } else {
        await createArea(data)
        Alert.alert('Listo', `Área "${form.name}" creada correctamente`)
      }
      setModalVisible(false)
      setEditingArea(null)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo guardar el área')
    }
  }

  function handleDelete(area: CommonArea) {
    Alert.alert(
      'Desactivar área',
      `¿Desactivar "${area.name}"? Los residentes no podrán hacer reservaciones nuevas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteArea(area.id)
            } catch {
              Alert.alert('Error', 'No se pudo desactivar el área')
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>Áreas Comunes</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>{areas.length} área{areas.length !== 1 ? 's' : ''} configurada{areas.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          onPress={() => { setEditingArea(null); setModalVisible(true) }}
          style={{ backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {areas.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="business-outline" size={48} color="#334155" />
              <Text style={{ color: '#94A3B8', fontSize: 16, fontWeight: '600', marginTop: 16 }}>Sin áreas configuradas</Text>
              <Text style={{ color: '#475569', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                Agrega alberca, salón de fiestas, gimnasio u otras áreas para que los residentes puedan hacer reservaciones.
              </Text>
              <TouchableOpacity
                onPress={() => { setEditingArea(null); setModalVisible(true) }}
                style={{ backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Agregar primera área</Text>
              </TouchableOpacity>
            </View>
          ) : (
            areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                onEdit={() => { setEditingArea(area); setModalVisible(true) }}
                onDelete={() => handleDelete(area)}
              />
            ))
          )}
        </ScrollView>
      )}

      <AreaFormModal
        visible={modalVisible}
        area={editingArea}
        onClose={() => { setModalVisible(false); setEditingArea(null) }}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </SafeAreaView>
  )
}

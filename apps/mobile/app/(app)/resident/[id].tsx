import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  useResident, useUpdateResident,
  useAddMember, useDeleteMember,
  useAddVehicle, useDeleteVehicle,
} from '../../../src/hooks/useResidents'
import type {
  HouseholdMember, Vehicle, MemberRelationship, VehicleType, OccupancyType,
} from '../../../src/services/resident.service'

// ── Helpers ───────────────────────────────────────────────────

const RELATIONSHIP_LABELS: Record<MemberRelationship, string> = {
  SPOUSE: 'Cónyuge', CHILD: 'Hijo/a', PARENT: 'Padre/Madre',
  SIBLING: 'Hermano/a', RELATIVE: 'Familiar', CARETAKER: 'Cuidador/a',
  EMPLOYEE: 'Empleado/a', PARTNER: 'Pareja', OTHER: 'Otro',
}
const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  CAR: 'Auto', MOTORCYCLE: 'Moto', TRUCK: 'Camioneta', VAN: 'Van', OTHER: 'Otro',
}
const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  CAR: 'car', MOTORCYCLE: 'bicycle', TRUCK: 'car-sport', VAN: 'bus', OTHER: 'ellipse',
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 24 }}>
      <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{title}</Text>
      {onAdd && (
        <TouchableOpacity onPress={onAdd} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
          <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>Agregar</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: '#64748B', fontSize: 11, marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: value ? 'white' : '#475569', fontSize: 15 }}>{value || '—'}</Text>
    </View>
  )
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: any
  autoCapitalize?: any
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor="#475569"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        style={{
          backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155',
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          color: 'white', fontSize: 15,
        }}
      />
    </View>
  )
}

// ── Add Member Modal ──────────────────────────────────────────

function AddMemberModal({
  visible, onClose, unitId,
}: { visible: boolean; onClose: () => void; unitId: string }) {
  const { mutateAsync: addMember, isPending } = useAddMember(unitId)
  const [form, setForm] = useState({
    name: '', relationship: 'OTHER' as MemberRelationship,
    phone: '', email: '', idDocument: '', canGrantAccess: false, notes: '',
  })
  const set = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.name.trim()) return Alert.alert('Error', 'El nombre es requerido')
    try {
      await addMember({
        name: form.name.trim(),
        relationship: form.relationship,
        phone: form.phone || null,
        email: form.email || null,
        idDocument: form.idDocument || null,
        canGrantAccess: form.canGrantAccess,
        notes: form.notes || null,
      })
      onClose()
      setForm({ name: '', relationship: 'OTHER', phone: '', email: '', idDocument: '', canGrantAccess: false, notes: '' })
    } catch {
      Alert.alert('Error', 'No se pudo agregar el miembro')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Nuevo habitante</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Field label="Nombre completo *" value={form.name} onChangeText={set('name')} placeholder="Ej. María García" />
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Parentesco</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.entries(RELATIONSHIP_LABELS) as [MemberRelationship, string][]).map(([k, v]) => (
                <TouchableOpacity
                  key={k} onPress={() => set('relationship')(k)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                    borderColor: form.relationship === k ? '#3B82F6' : '#334155',
                    backgroundColor: form.relationship === k ? '#3B82F620' : '#1E293B' }}
                >
                  <Text style={{ color: form.relationship === k ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Field label="Teléfono" value={form.phone} onChangeText={set('phone')} placeholder="+52 55 0000 0000" keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Correo" value={form.email} onChangeText={set('email')} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="No. de identificación (INE/Pasaporte)" value={form.idDocument} onChangeText={set('idDocument')} placeholder="Para verificación manual en portería" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>Puede autorizar entradas</Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>El guardia puede registrar su acceso</Text>
            </View>
            <Switch value={form.canGrantAccess} onValueChange={set('canGrantAccess')} trackColor={{ false: '#334155', true: '#3B82F6' }} thumbColor="white" />
          </View>
          <Field label="Notas" value={form.notes} onChangeText={set('notes')} placeholder="Horarios, permisos especiales…" />
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity
            onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Guardar habitante</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Add Vehicle Modal ─────────────────────────────────────────

function AddVehicleModal({
  visible, onClose, unitId,
}: { visible: boolean; onClose: () => void; unitId: string }) {
  const { mutateAsync: addVehicle, isPending } = useAddVehicle(unitId)
  const [form, setForm] = useState({
    type: 'CAR' as VehicleType, make: '', model: '', year: '',
    color: '', plateNumber: '', sticker: '', notes: '',
  })
  const set = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.make.trim() || !form.model.trim() || !form.color.trim() || !form.plateNumber.trim()) {
      return Alert.alert('Error', 'Marca, modelo, color y placa son requeridos')
    }
    try {
      await addVehicle({
        type: form.type, make: form.make.trim(), model: form.model.trim(),
        year: form.year ? parseInt(form.year) : null,
        color: form.color.trim(), plateNumber: form.plateNumber.trim().toUpperCase(),
        sticker: form.sticker || null, notes: form.notes || null,
      })
      onClose()
      setForm({ type: 'CAR', make: '', model: '', year: '', color: '', plateNumber: '', sticker: '', notes: '' })
    } catch {
      Alert.alert('Error', 'No se pudo agregar el vehículo')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Nuevo vehículo</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Tipo de vehículo</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {(Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][]).map(([k, v]) => (
              <TouchableOpacity
                key={k} onPress={() => set('type')(k)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                  borderColor: form.type === k ? '#3B82F6' : '#334155',
                  backgroundColor: form.type === k ? '#3B82F620' : '#1E293B' }}
              >
                <Ionicons name={VEHICLE_TYPE_ICONS[k] as any} size={16} color={form.type === k ? '#3B82F6' : '#64748B'} />
                <Text style={{ color: form.type === k ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Marca *" value={form.make} onChangeText={set('make')} placeholder="Toyota, Honda, Nissan…" />
          <Field label="Modelo *" value={form.model} onChangeText={set('model')} placeholder="Corolla, Civic, Versa…" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Año" value={form.year} onChangeText={set('year')} placeholder="2022" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Color *" value={form.color} onChangeText={set('color')} placeholder="Blanco, Rojo…" />
            </View>
          </View>
          <Field label="Placas *" value={form.plateNumber} onChangeText={set('plateNumber')} placeholder="ABC-1234" autoCapitalize="characters" />
          <Field label="No. calcomanía/permiso" value={form.sticker} onChangeText={set('sticker')} placeholder="Número asignado por el fraccionamiento" />
          <Field label="Notas" value={form.notes} onChangeText={set('notes')} placeholder="Observaciones adicionales" />
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity
            onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Guardar vehículo</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Edit Resident Modal ───────────────────────────────────────

function EditResidentModal({
  visible, onClose, resident,
}: { visible: boolean; onClose: () => void; resident: any }) {
  const { mutateAsync: update, isPending } = useUpdateResident(resident?.id ?? '')
  const unit = resident?.units?.[0]

  const [form, setForm] = useState({
    firstName: resident?.user?.firstName ?? '',
    lastName: resident?.user?.lastName ?? '',
    phone: resident?.user?.phone ?? '',
    emergencyContactName: resident?.emergencyContactName ?? '',
    emergencyContactPhone: resident?.emergencyContactPhone ?? '',
    emergencyContactRelation: resident?.emergencyContactRelation ?? '',
    occupancyType: (unit?.occupancyType ?? 'OWNER') as OccupancyType,
    ownerName: unit?.ownerName ?? '',
    ownerPhone: unit?.ownerPhone ?? '',
    ownerEmail: unit?.ownerEmail ?? '',
    unitEmergencyContactName: unit?.emergencyContactName ?? '',
    unitEmergencyContactPhone: unit?.emergencyContactPhone ?? '',
    unitEmergencyContactRelation: unit?.emergencyContactRelation ?? '',
    unitNotes: unit?.notes ?? '',
  })

  const set = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave() {
    try {
      await update({
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phone: form.phone || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        emergencyContactRelation: form.emergencyContactRelation || null,
        occupancyType: form.occupancyType,
        ownerName: form.ownerName || null,
        ownerPhone: form.ownerPhone || null,
        ownerEmail: form.ownerEmail || null,
        unitEmergencyContactName: form.unitEmergencyContactName || null,
        unitEmergencyContactPhone: form.unitEmergencyContactPhone || null,
        unitEmergencyContactRelation: form.unitEmergencyContactRelation || null,
        unitNotes: form.unitNotes || null,
      })
      onClose()
      Alert.alert('Guardado', 'Datos del residente actualizados')
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Editar residente</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>DATOS PERSONALES</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Nombre" value={form.firstName} onChangeText={set('firstName')} /></View>
            <View style={{ flex: 1 }}><Field label="Apellido" value={form.lastName} onChangeText={set('lastName')} /></View>
          </View>
          <Field label="Teléfono personal" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoCapitalize="none" />

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>CONTACTO DE EMERGENCIA (RESIDENTE)</Text>
          <Field label="Nombre del contacto" value={form.emergencyContactName} onChangeText={set('emergencyContactName')} placeholder="Ej. Roberto García" />
          <Field label="Teléfono" value={form.emergencyContactPhone} onChangeText={set('emergencyContactPhone')} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Parentesco/Relación" value={form.emergencyContactRelation} onChangeText={set('emergencyContactRelation')} placeholder="Hermano, Mamá, Amigo…" />

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>TIPO DE OCUPACIÓN</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {(['OWNER', 'TENANT'] as OccupancyType[]).map((t) => (
              <TouchableOpacity
                key={t} onPress={() => set('occupancyType')(t)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                  borderColor: form.occupancyType === t ? '#3B82F6' : '#334155',
                  backgroundColor: form.occupancyType === t ? '#3B82F620' : '#1E293B' }}
              >
                <Text style={{ color: form.occupancyType === t ? '#3B82F6' : '#94A3B8', fontWeight: '600' }}>
                  {t === 'OWNER' ? 'Propietario' : 'Inquilino'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.occupancyType === 'TENANT' && (
            <>
              <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 }}>DATOS DEL PROPIETARIO</Text>
              <Field label="Nombre del propietario" value={form.ownerName} onChangeText={set('ownerName')} />
              <Field label="Teléfono del propietario" value={form.ownerPhone} onChangeText={set('ownerPhone')} keyboardType="phone-pad" autoCapitalize="none" />
              <Field label="Correo del propietario" value={form.ownerEmail} onChangeText={set('ownerEmail')} keyboardType="email-address" autoCapitalize="none" />
            </>
          )}

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>CONTACTO DE EMERGENCIA (CASA)</Text>
          <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 10 }}>Persona a contactar si no hay respuesta en la unidad</Text>
          <Field label="Nombre" value={form.unitEmergencyContactName} onChangeText={set('unitEmergencyContactName')} />
          <Field label="Teléfono" value={form.unitEmergencyContactPhone} onChangeText={set('unitEmergencyContactPhone')} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Relación con la unidad" value={form.unitEmergencyContactRelation} onChangeText={set('unitEmergencyContactRelation')} placeholder="Vecino, Familiar, etc." />

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>NOTAS INTERNAS</Text>
          <Field label="Notas de la unidad" value={form.unitNotes} onChangeText={set('unitNotes')} placeholder="Observaciones para la administración…" />
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity
            onPress={handleSave} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Guardar cambios</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Main Detail Screen ────────────────────────────────────────

export default function ResidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: resident, isLoading, refetch } = useResident(id ?? '')
  const { mutateAsync: deleteMember } = useDeleteMember(resident?.units?.[0]?.id ?? '')
  const { mutateAsync: deleteVehicle } = useDeleteVehicle(resident?.units?.[0]?.id ?? '')

  const [showEdit, setShowEdit] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)

  const unit = resident?.units?.[0]

  function confirmDeleteMember(member: HouseholdMember) {
    Alert.alert('Eliminar habitante', `¿Eliminar a ${member.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMember(member.id).catch(() => Alert.alert('Error', 'No se pudo eliminar')) },
    ])
  }

  function confirmDeleteVehicle(vehicle: Vehicle) {
    Alert.alert('Eliminar vehículo', `¿Eliminar ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteVehicle(vehicle.id).catch(() => Alert.alert('Error', 'No se pudo eliminar')) },
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </SafeAreaView>
    )
  }

  if (!resident) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#64748B' }}>Residente no encontrado</Text>
      </SafeAreaView>
    )
  }

  const pendingPayments = resident.payments?.filter((p) => p.status === 'PENDING') ?? []
  const totalPending = pendingPayments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>Detalle residente</Text>
        <TouchableOpacity onPress={() => setShowEdit(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="create-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Identity card */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#3B82F640' }}>
            <Text style={{ color: '#3B82F6', fontSize: 28, fontWeight: '700' }}>
              {resident.user.firstName[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>
            {resident.user.firstName} {resident.user.lastName}
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{resident.user.email}</Text>
          {resident.user.phone && (
            <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>{resident.user.phone}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {unit && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#3B82F620', borderWidth: 1, borderColor: '#3B82F640' }}>
                <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>
                  Unidad {unit.block ? `${unit.block}-` : ''}{unit.number}
                </Text>
              </View>
            )}
            {unit && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
                backgroundColor: unit.occupancyType === 'OWNER' ? '#3B82F620' : '#F59E0B20',
                borderWidth: 1, borderColor: unit.occupancyType === 'OWNER' ? '#3B82F640' : '#F59E0B40' }}>
                <Text style={{ color: unit.occupancyType === 'OWNER' ? '#3B82F6' : '#F59E0B', fontSize: 12, fontWeight: '600' }}>
                  {unit.occupancyType === 'OWNER' ? 'Propietario' : 'Inquilino'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Pending payment banner */}
        {pendingPayments.length > 0 && (
          <View style={{ backgroundColor: '#F9731610', borderWidth: 1, borderColor: '#F9731640', borderRadius: 14, padding: 14, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="alert-circle" size={20} color="#F97316" />
            <View>
              <Text style={{ color: '#F97316', fontWeight: '600', fontSize: 14 }}>
                ${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN pendiente
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>{pendingPayments.length} pago(s) sin liquidar</Text>
            </View>
          </View>
        )}

        {/* Emergency contact */}
        {(resident.emergencyContactName || resident.emergencyContactPhone) && (
          <>
            <SectionHeader title="CONTACTO DE EMERGENCIA" />
            <View style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
              <InfoRow label="Nombre" value={resident.emergencyContactName} />
              <InfoRow label="Teléfono" value={resident.emergencyContactPhone} />
              <InfoRow label="Relación" value={resident.emergencyContactRelation} />
            </View>
          </>
        )}

        {/* Unit info */}
        {unit && (unit.ownerName || unit.emergencyContactName) && (
          <>
            <SectionHeader title="INFORMACIÓN DE LA UNIDAD" />
            <View style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
              {unit.ownerName && <InfoRow label="Propietario" value={unit.ownerName} />}
              {unit.ownerPhone && <InfoRow label="Tel. propietario" value={unit.ownerPhone} />}
              {unit.ownerEmail && <InfoRow label="Email propietario" value={unit.ownerEmail} />}
              {unit.emergencyContactName && (
                <>
                  <InfoRow label="Contacto emergencia casa" value={unit.emergencyContactName} />
                  <InfoRow label="Tel. emergencia" value={unit.emergencyContactPhone} />
                  <InfoRow label="Relación" value={unit.emergencyContactRelation} />
                </>
              )}
              {unit.notes && <InfoRow label="Notas" value={unit.notes} />}
            </View>
          </>
        )}

        {/* Household members */}
        <SectionHeader
          title="HABITANTES AUTORIZADOS"
          onAdd={() => unit && setShowAddMember(true)}
        />
        {unit?.householdMembers?.length === 0 && (
          <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>Sin habitantes adicionales registrados</Text>
        )}
        {unit?.householdMembers?.map((m) => (
          <View key={m.id} style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 16 }}>{m.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{m.name}</Text>
                {m.canGrantAccess && (
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: '#22C55E20' }}>
                    <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '600' }}>Puede autorizar</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>{RELATIONSHIP_LABELS[m.relationship]}</Text>
              {m.phone && <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{m.phone}</Text>}
              {m.idDocument && <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>ID: {m.idDocument}</Text>}
            </View>
            <TouchableOpacity onPress={() => confirmDeleteMember(m)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Vehicles */}
        <SectionHeader
          title="VEHÍCULOS"
          onAdd={() => unit && setShowAddVehicle(true)}
        />
        {unit?.vehicles?.length === 0 && (
          <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>Sin vehículos registrados</Text>
        )}
        {unit?.vehicles?.map((v) => (
          <View key={v.id} style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#3B82F610', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={VEHICLE_TYPE_ICONS[v.type] as any} size={22} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{v.make} {v.model} {v.year ? `(${v.year})` : ''}</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 1 }}>
                {v.color} · {v.plateNumber}
              </Text>
              {v.sticker && <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>Calcomanía: {v.sticker}</Text>}
            </View>
            <TouchableOpacity onPress={() => confirmDeleteVehicle(v)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Payment history */}
        {(resident.payments?.length ?? 0) > 0 && (
          <>
            <SectionHeader title="ÚLTIMOS PAGOS" />
            {resident.payments!.slice(0, 6).map((p) => (
              <View key={p.id} style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: p.status === 'PENDING' ? '#F9731640' : '#334155', marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{p.description}</Text>
                  <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                    {p.status === 'COMPLETED'
                      ? `Pagado · ${p.paymentMethod}`
                      : p.status === 'PENDING' ? 'Pendiente' : p.status}
                  </Text>
                </View>
                <Text style={{ color: p.status === 'PENDING' ? '#F97316' : p.status === 'COMPLETED' ? '#22C55E' : '#94A3B8', fontWeight: '700', fontSize: 14 }}>
                  ${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </Text>
              </View>
            ))}
          </>
        )}

      </ScrollView>

      {/* Modals */}
      <EditResidentModal visible={showEdit} onClose={() => { setShowEdit(false); refetch() }} resident={resident} />
      {unit && (
        <>
          <AddMemberModal visible={showAddMember} onClose={() => { setShowAddMember(false); refetch() }} unitId={unit.id} />
          <AddVehicleModal visible={showAddVehicle} onClose={() => { setShowAddVehicle(false); refetch() }} unitId={unit.id} />
        </>
      )}
    </SafeAreaView>
  )
}

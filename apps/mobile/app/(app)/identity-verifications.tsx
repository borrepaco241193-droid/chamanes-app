import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Image, Modal, TextInput, RefreshControl, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useIdVerifications, useVerifyId } from '../../src/hooks/useAdmin'
import type { IdVerification } from '../../src/services/admin.service'

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const STATUS_LABEL: Record<string, string> = {
  ALL:      'Todos',
  PENDING:  'Pendientes',
  APPROVED: 'Aprobadas',
  REJECTED: 'Rechazadas',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:  '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
}

const STATUS_ICON: Record<string, string> = {
  PENDING:  'time-outline',
  APPROVED: 'checkmark-circle-outline',
  REJECTED: 'close-circle-outline',
}

// ── Photo Lightbox ────────────────────────────────────────────

function PhotoModal({ uri, name, visible, onClose }: {
  uri: string | null; name: string; visible: boolean; onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#000000E0', alignItems: 'center', justifyContent: 'center' }}
        onPress={onClose}
        activeOpacity={1}
      >
        {uri && (
          <Image
            source={{ uri }}
            style={{ width: '92%', height: '60%', borderRadius: 16 }}
            resizeMode="contain"
          />
        )}
        <Text style={{ color: '#94A3B8', marginTop: 16, fontSize: 14 }}>{name}</Text>
        <Text style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Toca para cerrar</Text>
      </TouchableOpacity>
    </Modal>
  )
}

// ── Reject Note Modal ─────────────────────────────────────────

function RejectModal({ visible, name, onConfirm, onClose }: {
  visible: boolean; name: string
  onConfirm: (note: string) => void; onClose: () => void
}) {
  const [note, setNote] = useState('')

  function handleConfirm() {
    onConfirm(note.trim())
    setNote('')
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000080' }}>
        <View style={{ backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>Rechazar verificación</Text>
          <Text style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
            Se notificará a {name} para que suba una nueva foto.
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 8 }}>Motivo (opcional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ej: Foto borrosa, ID no legible…"
            placeholderTextColor="#475569"
            multiline
            style={{
              backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
              borderRadius: 12, padding: 14, color: 'white', fontSize: 14,
              minHeight: 80, marginBottom: 20,
            }}
          />
          <TouchableOpacity
            onPress={handleConfirm}
            style={{ backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444440', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 }}
          >
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 16 }}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: 12 }}>
            <Text style={{ color: '#475569', fontSize: 15 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Verification Card ─────────────────────────────────────────

function VerificationCard({
  item, onApprove, onReject, onPhotoPress,
}: {
  item: IdVerification
  onApprove: (v: IdVerification) => void
  onReject:  (v: IdVerification) => void
  onPhotoPress: (v: IdVerification) => void
}) {
  const status = item.idVerificationStatus
  const color  = STATUS_COLOR[status] ?? '#64748B'
  const timeAgo = formatDistanceToNow(new Date(item.updatedAt), { locale: es, addSuffix: true })

  return (
    <View style={{
      backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: status === 'PENDING' ? '#F59E0B30' : '#334155',
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ color, fontWeight: '700', fontSize: 17 }}>{item.firstName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{item.firstName} {item.lastName}</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>{item.email}</Text>
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: `${color}15`, borderRadius: 20,
          paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${color}30`,
        }}>
          <Ionicons name={STATUS_ICON[status] as any} size={13} color={color} />
          <Text style={{ color, fontSize: 12, fontWeight: '600' }}>
            {STATUS_LABEL[status] ?? status}
          </Text>
        </View>
      </View>

      {/* Photo */}
      {item.idPhotoUrl ? (
        <TouchableOpacity onPress={() => onPhotoPress(item)} style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <Image source={{ uri: item.idPhotoUrl }} style={{ width: '100%', height: 170 }} resizeMode="cover" />
          <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#0F172A80', borderRadius: 8, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="expand-outline" size={14} color="white" />
            <Text style={{ color: 'white', fontSize: 11 }}>Ampliar</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ backgroundColor: '#0F172A', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' }}>
          <Ionicons name="image-outline" size={28} color="#334155" />
          <Text style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>Sin foto disponible</Text>
        </View>
      )}

      {/* Rejection note if any */}
      {item.idVerificationNote && (
        <View style={{ backgroundColor: '#EF444410', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#EF444430' }}>
          <Text style={{ color: '#EF4444', fontSize: 12 }}>
            <Text style={{ fontWeight: '700' }}>Motivo de rechazo: </Text>
            {item.idVerificationNote}
          </Text>
        </View>
      )}

      <Text style={{ color: '#475569', fontSize: 11, marginBottom: 10 }}>Actualizado {timeAgo}</Text>

      {/* Action buttons — only for PENDING */}
      {status === 'PENDING' && item.idPhotoUrl && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => onReject(item)}
            style={{ flex: 1, backgroundColor: '#EF444415', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}
          >
            <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 14 }}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onApprove(item)}
            style={{ flex: 1, backgroundColor: '#10B98115', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#10B98140' }}
          >
            <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 14 }}>Aprobar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────

export default function IdentityVerificationsScreen() {
  const [filter, setFilter] = useState<FilterStatus>('PENDING')
  const [photoTarget, setPhotoTarget] = useState<IdVerification | null>(null)
  const [rejectTarget, setRejectTarget] = useState<IdVerification | null>(null)

  const { data, isLoading, refetch, isRefetching } = useIdVerifications(filter)
  const { mutateAsync: verifyId, isPending: isVerifying } = useVerifyId()

  const verifications = data?.verifications ?? []

  async function handleApprove(item: IdVerification) {
    Alert.alert(
      'Aprobar verificación',
      `¿Aprobar la identidad de ${item.firstName} ${item.lastName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            try {
              await verifyId({ userId: item.id, approve: true })
              Alert.alert('Aprobado', `Identidad de ${item.firstName} verificada. Se notificó al residente.`)
            } catch {
              Alert.alert('Error', 'No se pudo procesar la verificación')
            }
          },
        },
      ],
    )
  }

  function handleReject(item: IdVerification) {
    setRejectTarget(item)
  }

  async function handleConfirmReject(note: string) {
    if (!rejectTarget) return
    const target = rejectTarget
    setRejectTarget(null)
    try {
      await verifyId({ userId: target.id, approve: false, note })
      Alert.alert('Rechazado', `Se notificó a ${target.firstName} para que suba una nueva foto.`)
    } catch {
      Alert.alert('Error', 'No se pudo procesar el rechazo')
    }
  }

  const FILTERS: FilterStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']
  const counts = {
    PENDING:  (data?.verifications ?? []).length, // will refetch per tab
    APPROVED: 0,
    REJECTED: 0,
    ALL:      0,
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
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Verificaciones de identidad</Text>
          <Text style={{ color: '#475569', fontSize: 12 }}>Revisa y aprueba las IDs de residentes</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: filter === f ? '#3B82F6' : '#1E293B',
              borderWidth: 1, borderColor: filter === f ? '#3B82F6' : '#334155',
            }}
          >
            <Text style={{ color: filter === f ? 'white' : '#64748B', fontWeight: '600', fontSize: 13 }}>
              {STATUS_LABEL[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <FlatList
          data={verifications}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="shield-checkmark-outline" size={52} color="#1E293B" />
              <Text style={{ color: '#475569', fontSize: 16, marginTop: 16, fontWeight: '600' }}>
                {filter === 'PENDING' ? 'Sin verificaciones pendientes' :
                 filter === 'APPROVED' ? 'Sin verificaciones aprobadas' :
                 filter === 'REJECTED' ? 'Sin verificaciones rechazadas' :
                 'Sin verificaciones registradas'}
              </Text>
              <Text style={{ color: '#334155', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                {filter === 'PENDING'
                  ? 'Cuando un residente suba su foto de identificación aparecerá aquí'
                  : 'Cambia el filtro para ver otros estados'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <VerificationCard
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              onPhotoPress={setPhotoTarget}
            />
          )}
        />
      )}

      {/* Modals */}
      <PhotoModal
        uri={photoTarget?.idPhotoUrl ?? null}
        name={photoTarget ? `${photoTarget.firstName} ${photoTarget.lastName}` : ''}
        visible={!!photoTarget}
        onClose={() => setPhotoTarget(null)}
      />

      <RejectModal
        visible={!!rejectTarget}
        name={rejectTarget ? `${rejectTarget.firstName} ${rejectTarget.lastName}` : ''}
        onConfirm={handleConfirmReject}
        onClose={() => setRejectTarget(null)}
      />
    </SafeAreaView>
  )
}

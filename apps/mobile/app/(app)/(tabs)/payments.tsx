import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { usePayments, useCheckout, useGenerateFees } from '../../../src/hooks/usePayments'
import { useMarkPaid, useUploadTransferProof } from '../../../src/hooks/useResidents'
import { useAuthStore } from '../../../src/stores/auth.store'
import * as ImagePicker from 'expo-image-picker'
import { format, isPast, differenceInDays } from 'date-fns'
import type { Payment, PaymentStatus } from '../../../src/services/payment.service'

const STATUS_CONFIG: Record<PaymentStatus, { label: string; bg: string; text: string; icon: string }> = {
  PENDING: { label: 'Pendiente', bg: 'bg-orange-500/20', text: 'text-orange-400', icon: 'time-outline' },
  PROCESSING: { label: 'Procesando', bg: 'bg-blue-500/20', text: 'text-blue-400', icon: 'sync-outline' },
  COMPLETED: { label: 'Pagado', bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: 'checkmark-circle-outline' },
  FAILED: { label: 'Fallido', bg: 'bg-red-500/20', text: 'text-red-400', icon: 'close-circle-outline' },
  REFUNDED: { label: 'Reembolsado', bg: 'bg-slate-500/20', text: 'text-slate-400', icon: 'return-down-back-outline' },
}

const FILTERS: { label: string; value?: PaymentStatus }[] = [
  { label: 'Todos' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Pagados', value: 'COMPLETED' },
]

function PaymentCard({ payment, onPay, onMarkPaid, isAdmin }: { payment: Payment; onPay: (id: string) => void; onMarkPaid?: (id: string) => void; isAdmin?: boolean }) {
  // Show resident name for admin view
  const residentName = isAdmin && payment.user
    ? `${payment.user.firstName} ${payment.user.lastName}`
    : null
  const cfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.PENDING
  const isDue = payment.dueDate && isPast(new Date(payment.dueDate)) && payment.status === 'PENDING'
  const daysUntilDue = payment.dueDate
    ? differenceInDays(new Date(payment.dueDate), new Date())
    : null

  return (
    <View
      className={`bg-surface-card border rounded-2xl p-4 mb-3 ${isDue ? 'border-red-500/40' : 'border-surface-border'}`}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white font-semibold text-base">{payment.description}</Text>
          {residentName && (
            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>{residentName}</Text>
          )}
          {payment.unit && (
            <Text className="text-surface-muted text-xs mt-0.5">
              Unidad {payment.unit.block ? `${payment.unit.block}-` : ''}{payment.unit.number}
            </Text>
          )}
        </View>
        <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${cfg.bg}`}>
          <Ionicons name={cfg.icon as any} size={12} color="" />
          <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
        </View>
      </View>

      {/* Amount */}
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">
            ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            <Text className="text-surface-muted text-sm font-normal"> {payment.currency}</Text>
          </Text>
          {payment.lateFeeApplied && (
            <Text className="text-red-400 text-xs">
              Incluye recargo: ${Number(payment.lateFeeAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>
          )}
          {payment.dueDate && payment.status === 'PENDING' && (
            <Text className={`text-xs mt-1 ${isDue ? 'text-red-400' : daysUntilDue !== null && daysUntilDue <= 5 ? 'text-orange-400' : 'text-surface-muted'}`}>
              {isDue
                ? `Vencido ${format(new Date(payment.dueDate), 'd MMM')}`
                : `Vence ${format(new Date(payment.dueDate), 'd MMM yyyy')}`}
            </Text>
          )}
          {payment.paidAt && (
            <Text className="text-surface-muted text-xs mt-1">
              Pagado el {format(new Date(payment.paidAt), 'd MMM yyyy')}
            </Text>
          )}
        </View>

        {payment.status === 'PENDING' && (
          <View style={{ gap: 8, alignItems: 'flex-end' }}>
            <TouchableOpacity
              onPress={() => onPay(payment.id)}
              className="bg-primary-500 px-5 py-2.5 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-sm">Pagar online</Text>
            </TouchableOpacity>
            {isAdmin && onMarkPaid && (
              <TouchableOpacity
                onPress={() => onMarkPaid(payment.id)}
                style={{ backgroundColor: '#22C55E20', borderWidth: 1, borderColor: '#22C55E40', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={14} color="#22C55E" />
                <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 12 }}>Efectivo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {payment.status === 'COMPLETED' && payment.stripeReceiptUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(payment.stripeReceiptUrl!)}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="receipt-outline" size={16} color="#3B82F6" />
            <Text className="text-primary-400 text-sm">Recibo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default function PaymentsScreen() {
  const [filter, setFilter] = useState<PaymentStatus | undefined>(undefined)
  const { data, isLoading, refetch, isRefetching } = usePayments(filter)
  const { mutateAsync: getCheckout } = useCheckout()
  const { mutateAsync: markPaid } = useMarkPaid()
  const { mutateAsync: uploadProof } = useUploadTransferProof()
  const { mutateAsync: generateFees, isPending: isGenerating } = useGenerateFees()
  const [payingId, setPayingId] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const isAdmin = (
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'COMMUNITY_ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.communityRole === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER'
  )

  async function handleMarkPaid(paymentId: string) {
    Alert.alert(
      'Registrar pago manual',
      '¿Cómo recibiste el pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Efectivo', onPress: () => doMarkPaid(paymentId, 'CASH') },
        { text: 'Transferencia', onPress: () => doMarkPaidTransfer(paymentId) },
      ],
    )
  }

  async function doMarkPaid(paymentId: string, method: 'CASH' | 'TRANSFER', transferProofUrl?: string) {
    try {
      await markPaid({ paymentId, data: { paymentMethod: method, transferProofUrl: transferProofUrl ?? null } })
      refetch()
      Alert.alert('Listo', 'Pago registrado correctamente')
    } catch {
      Alert.alert('Error', 'No se pudo registrar el pago')
    }
  }

  async function doMarkPaidTransfer(paymentId: string) {
    // Ask if they want to attach a screenshot
    Alert.alert(
      'Comprobante de transferencia',
      '¿Deseas adjuntar una captura de pantalla del comprobante?',
      [
        {
          text: 'Sin comprobante',
          onPress: () => doMarkPaid(paymentId, 'TRANSFER'),
        },
        {
          text: 'Adjuntar captura',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!permission.granted) {
              Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar el comprobante.')
              return
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              allowsEditing: false,
            })
            if (result.canceled || !result.assets[0]) {
              // Cancelled — mark as paid without proof
              doMarkPaid(paymentId, 'TRANSFER')
              return
            }
            const asset = result.assets[0]
            try {
              // Upload proof first, then mark paid
              const { url } = await uploadProof({
                paymentId,
                imageUri: asset.uri,
                mimeType: asset.mimeType ?? 'image/jpeg',
              })
              await doMarkPaid(paymentId, 'TRANSFER', url)
            } catch {
              // Upload failed — mark paid without proof
              Alert.alert('Aviso', 'No se pudo subir el comprobante, pero el pago fue registrado.')
              doMarkPaid(paymentId, 'TRANSFER')
            }
          },
        },
      ],
    )
  }

  async function handlePay(paymentId: string) {
    setPayingId(paymentId)
    try {
      const { checkoutUrl } = await getCheckout(paymentId)
      await Linking.openURL(checkoutUrl)
      // After returning from browser, prompt to refresh
      Alert.alert(
        'Pago iniciado',
        'Si completaste el pago, toca Actualizar para ver el estado.',
        [
          { text: 'Actualizar', onPress: () => refetch() },
          { text: 'Cerrar', style: 'cancel' },
        ],
      )
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'No se pudo iniciar el pago'
      const isUnavailable = err?.response?.status === 503
      Alert.alert(
        isUnavailable ? 'Pagos no disponibles' : 'Error al pagar',
        msg,
        [{ text: 'Entendido' }],
      )
    } finally {
      setPayingId(null)
    }
  }

  async function handleGenerateFees() {
    const now = new Date()
    Alert.alert(
      'Generar cuotas del mes',
      `¿Generar cuotas de mantenimiento para ${now.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar',
          onPress: async () => {
            try {
              const result = await generateFees({ month: now.getMonth() + 1, year: now.getFullYear() })
              refetch()
              Alert.alert('Listo', `Se generaron ${result.created ?? 0} cuotas nuevas.`)
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'No se pudieron generar las cuotas')
            }
          },
        },
      ],
    )
  }

  // Summary stats
  const pending = data?.payments?.filter((p) => p.status === 'PENDING') ?? []
  const totalPending = pending.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="px-6 pt-2 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">Pagos</Text>
          {isAdmin && (
            <Text className="text-surface-muted text-xs mt-0.5">
              {data?.total ?? 0} registros · vista administrador
            </Text>
          )}
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={handleGenerateFees}
            disabled={isGenerating}
            style={{ backgroundColor: '#10B98120', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#10B98140' }}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={16} color="#10B981" />
            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Generar cuotas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Balance card */}
      {pending.length > 0 && (
        <View className="mx-6 mb-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
          <Text className="text-orange-400 text-xs font-medium uppercase tracking-wider">Balance pendiente</Text>
          <Text className="text-white text-3xl font-bold mt-1">
            ${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </Text>
          <Text className="text-surface-muted text-sm mt-1">
            {pending.length} {pending.length === 1 ? 'pago pendiente' : 'pagos pendientes'}
          </Text>
        </View>
      )}

      {/* Filter chips */}
      <View className="flex-row px-6 gap-2 mb-4">
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full border ${
              filter === f.value
                ? 'bg-primary-500 border-primary-500'
                : 'border-surface-border bg-surface-card'
            }`}
          >
            <Text
              className={`text-xs font-medium ${filter === f.value ? 'text-white' : 'text-surface-muted'}`}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={data?.payments ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PaymentCard
              payment={item}
              onPay={payingId === item.id ? () => {} : handlePay}
              onMarkPaid={handleMarkPaid}
              isAdmin={isAdmin}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="card-outline" size={48} color="#334155" />
              <Text className="text-surface-muted mt-3 text-base">No hay pagos registrados</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Vibration,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useRef, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useScanQR, useAccessEvents } from '../../../src/hooks/useVisitors'
import { gateService } from '../../../src/services/gate.service'
import { useAuthStore } from '../../../src/stores/auth.store'
import { format } from 'date-fns'

type ScanMode = 'scanner' | 'log'
type ScanResult = {
  success: boolean
  message: string
  visitorName?: string
  timestamp: Date
}

// ── Scan result overlay ───────────────────────────────────────
function ResultOverlay({
  result,
  onDismiss,
}: {
  result: ScanResult
  onDismiss: () => void
}) {
  const bg = result.success ? 'bg-emerald-500' : 'bg-red-500'
  const icon = result.success ? 'checkmark-circle' : 'close-circle'

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/70">
      <View className={`${bg} rounded-3xl p-8 items-center mx-8 w-full max-w-xs`}>
        <Ionicons name={icon as any} size={64} color="white" />
        {result.visitorName && (
          <Text className="text-white text-xl font-bold mt-3 text-center">
            {result.visitorName}
          </Text>
        )}
        <Text className="text-white/90 text-center mt-2">{result.message}</Text>
        <TouchableOpacity
          onPress={onDismiss}
          className="bg-white/20 rounded-full px-8 py-2.5 mt-5"
        >
          <Text className="text-white font-semibold">Scan Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Access event row ──────────────────────────────────────────
function EventRow({
  event,
}: {
  event: {
    id: string
    type: string
    personName: string
    isAllowed: boolean
    deniedReason?: string
    createdAt: string
  }
}) {
  const isEntry = event.type === 'ENTRY'
  const entryIcon = isEntry ? 'enter-outline' : 'exit-outline'

  return (
    <View className="flex-row items-center py-3 border-b border-surface-border">
      <View
        className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
          event.isAllowed ? 'bg-emerald-500/20' : 'bg-red-500/20'
        }`}
      >
        <Ionicons
          name={event.isAllowed ? (entryIcon as any) : 'ban-outline'}
          size={18}
          color={event.isAllowed ? '#10B981' : '#EF4444'}
        />
      </View>
      <View className="flex-1">
        <Text className="text-white text-sm font-medium">{event.personName}</Text>
        <Text className="text-surface-muted text-xs">
          {event.isAllowed
            ? `${isEntry ? 'Entered' : 'Exited'} · ${format(new Date(event.createdAt), 'h:mm a')}`
            : `Denied: ${event.deniedReason ?? 'Unknown'}`}
        </Text>
      </View>
      <Text className="text-surface-muted text-xs">{format(new Date(event.createdAt), 'HH:mm')}</Text>
    </View>
  )
}

// ── Main gate screen ──────────────────────────────────────────
export default function GateScreen() {
  const [mode, setMode] = useState<ScanMode>('scanner')
  const [entryType, setEntryType] = useState<'ENTRY' | 'EXIT'>('ENTRY')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [gateLoading, setGateLoading] = useState<'entry' | 'exit' | null>(null)
  const [gateMsg, setGateMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const lastScannedRef = useRef<string | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const { mutateAsync: scanQR } = useScanQR()
  const { data: eventsData, refetch: refetchEvents, isRefetching } = useAccessEvents()
  const { activeCommunityId } = useAuthStore()

  const sendGateCommand = useCallback(async (type: 'entry' | 'exit') => {
    if (!activeCommunityId) return
    setGateLoading(type)
    setGateMsg(null)
    try {
      if (type === 'entry') {
        await gateService.openEntry(activeCommunityId)
      } else {
        await gateService.openExit(activeCommunityId)
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setGateMsg({ text: type === 'entry' ? '✅ Puerta de entrada abierta' : '✅ Puerta de salida abierta', ok: true })
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setGateMsg({ text: err?.response?.data?.message ?? 'Error al enviar comando', ok: false })
    } finally {
      setGateLoading(null)
      setTimeout(() => setGateMsg(null), 4000)
    }
  }, [activeCommunityId])

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      // Debounce: ignore same QR within 3 seconds
      if (isProcessing || lastScannedRef.current === data) return

      lastScannedRef.current = data
      setIsProcessing(true)

      // Clear debounce after 3s
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
      cooldownRef.current = setTimeout(() => {
        lastScannedRef.current = null
      }, 3000)

      try {
        const result = await scanQR({ qrToken: data, type: entryType })
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setScanResult({
          success: true,
          message: `${entryType === 'ENTRY' ? 'Entry' : 'Exit'} granted`,
          visitorName: result.pass.visitorName,
          timestamp: new Date(),
        })
      } catch (err: any) {
        Vibration.vibrate([0, 200, 100, 200])
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setScanResult({
          success: false,
          message: err?.response?.data?.message ?? 'Access denied',
          timestamp: new Date(),
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [isProcessing, entryType, scanQR],
  )

  function dismissResult() {
    setScanResult(null)
    lastScannedRef.current = null
  }

  // ── Camera permission required ────────────────────────────
  if (!cameraPermission) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    )
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-8">
        <Ionicons name="camera-outline" size={64} color="#334155" />
        <Text className="text-white text-xl font-bold mt-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-surface-muted text-center mt-2 mb-6">
          Camera is needed to scan visitor QR codes at the gate.
        </Text>
        <TouchableOpacity
          onPress={requestCameraPermission}
          className="bg-primary-500 px-8 py-3 rounded-2xl"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <Text className="text-white text-2xl font-bold">Gate Control</Text>
        {/* Mode toggle */}
        <View className="flex-row bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <TouchableOpacity
            onPress={() => setMode('scanner')}
            className={`px-3 py-1.5 ${mode === 'scanner' ? 'bg-primary-500' : ''}`}
          >
            <Ionicons
              name="scan-outline"
              size={18}
              color={mode === 'scanner' ? 'white' : '#64748B'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('log')}
            className={`px-3 py-1.5 ${mode === 'log' ? 'bg-primary-500' : ''}`}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={mode === 'log' ? 'white' : '#64748B'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Gate open buttons ─────────────────────────── */}
      <View className="mx-6 mb-4 bg-surface-card border border-surface-border rounded-2xl p-4 gap-3">
        <Text className="text-surface-muted text-xs font-semibold uppercase tracking-wider">Abrir puerta</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => sendGateCommand('entry')}
            disabled={!!gateLoading}
            className="flex-1 flex-row items-center justify-center gap-2 bg-emerald-600 active:bg-emerald-700 py-3 rounded-xl"
          >
            {gateLoading === 'entry'
              ? <ActivityIndicator size="small" color="white" />
              : <Ionicons name="enter-outline" size={18} color="white" />}
            <Text className="text-white font-bold text-sm">Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sendGateCommand('exit')}
            disabled={!!gateLoading}
            className="flex-1 flex-row items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 py-3 rounded-xl"
          >
            {gateLoading === 'exit'
              ? <ActivityIndicator size="small" color="white" />
              : <Ionicons name="exit-outline" size={18} color="white" />}
            <Text className="text-white font-bold text-sm">Salida</Text>
          </TouchableOpacity>
        </View>
        {gateMsg && (
          <Text className={`text-xs text-center font-medium ${gateMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {gateMsg.text}
          </Text>
        )}
      </View>

      {mode === 'scanner' ? (
        <>
          {/* Entry / Exit selector */}
          <View className="flex-row mx-6 mb-4 bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
            <TouchableOpacity
              onPress={() => setEntryType('ENTRY')}
              className={`flex-1 flex-row items-center justify-center py-3 gap-2 ${
                entryType === 'ENTRY' ? 'bg-emerald-500/20' : ''
              }`}
            >
              <Ionicons
                name="enter-outline"
                size={18}
                color={entryType === 'ENTRY' ? '#10B981' : '#64748B'}
              />
              <Text
                className={`font-semibold ${
                  entryType === 'ENTRY' ? 'text-emerald-400' : 'text-surface-muted'
                }`}
              >
                Entry
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEntryType('EXIT')}
              className={`flex-1 flex-row items-center justify-center py-3 gap-2 ${
                entryType === 'EXIT' ? 'bg-orange-500/20' : ''
              }`}
            >
              <Ionicons
                name="exit-outline"
                size={18}
                color={entryType === 'EXIT' ? '#F59E0B' : '#64748B'}
              />
              <Text
                className={`font-semibold ${
                  entryType === 'EXIT' ? 'text-orange-400' : 'text-surface-muted'
                }`}
              >
                Exit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Camera */}
          <View className="flex-1 mx-6 rounded-3xl overflow-hidden relative">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanResult ? undefined : handleBarCodeScanned}
            />

            {/* Scan frame overlay */}
            {!scanResult && (
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-56 h-56 border-2 border-white/60 rounded-2xl" />
                <Text className="text-white/70 text-sm mt-4 text-center">
                  {isProcessing ? 'Processing...' : 'Point camera at visitor QR code'}
                </Text>
              </View>
            )}

            {/* Result overlay */}
            {scanResult && (
              <ResultOverlay result={scanResult} onDismiss={dismissResult} />
            )}
          </View>

          <View className="h-6" />
        </>
      ) : (
        /* Access log */
        <FlatList
          data={eventsData?.events ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventRow event={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetchEvents}
              tintColor="#3B82F6"
            />
          }
          ListHeaderComponent={
            <View className="flex-row items-center justify-between py-3 mb-1">
              <Text className="text-surface-muted text-sm">
                {eventsData?.total ?? 0} events today
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="list-outline" size={48} color="#334155" />
              <Text className="text-surface-muted mt-3">No access events yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

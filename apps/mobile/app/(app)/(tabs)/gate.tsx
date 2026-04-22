import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Vibration,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useRef, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { PermissionsAndroid, Platform } from 'react-native'
import { useScanQR, useAccessEvents } from '../../../src/hooks/useVisitors'
import { gateService } from '../../../src/services/gate.service'
import { useAuthStore } from '../../../src/stores/auth.store'
import { useCommunity, useUpdateCommunity } from '../../../src/hooks/useCommunity'
import { format } from 'date-fns'

type ScanMode = 'scanner' | 'log'
type ScanResult = {
  success: boolean
  message: string
  visitorName?: string
  timestamp: Date
}

const GATE_RADIUS_METERS = 100
const UNRESTRICTED_ROLES = ['SUPER_ADMIN', 'COMMUNITY_ADMIN']

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Scan result overlay ───────────────────────────────────────
function ResultOverlay({ result, onDismiss }: { result: ScanResult; onDismiss: () => void }) {
  const bg = result.success ? 'bg-emerald-500' : 'bg-red-500'
  const icon = result.success ? 'checkmark-circle' : 'close-circle'
  return (
    <View className="absolute inset-0 items-center justify-center bg-black/70">
      <View className={`${bg} rounded-3xl p-8 items-center mx-8 w-full max-w-xs`}>
        <Ionicons name={icon as any} size={64} color="white" />
        {result.visitorName && (
          <Text className="text-white text-xl font-bold mt-3 text-center">{result.visitorName}</Text>
        )}
        <Text className="text-white/90 text-center mt-2">{result.message}</Text>
        <TouchableOpacity onPress={onDismiss} className="bg-white/20 rounded-full px-8 py-2.5 mt-5">
          <Text className="text-white font-semibold">Scan Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Access event row ──────────────────────────────────────────
function EventRow({ event }: { event: { id: string; type: string; personName: string; isAllowed: boolean; deniedReason?: string; createdAt: string } }) {
  const isEntry = event.type === 'ENTRY'
  return (
    <View className="flex-row items-center py-3 border-b border-surface-border">
      <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${event.isAllowed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
        <Ionicons
          name={event.isAllowed ? (isEntry ? 'enter-outline' : 'exit-outline') : 'ban-outline'}
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
  const [pinningLocation, setPinningLocation] = useState(false)
  const lastScannedRef = useRef<string | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const { mutateAsync: scanQR } = useScanQR()
  const { data: eventsData, refetch: refetchEvents, isRefetching } = useAccessEvents()
  const { activeCommunityIds, user } = useAuthStore()

  const communities = user?.communities ?? []
  const defaultCommunityId = activeCommunityIds[0] ?? user?.communityId ?? ''
  const [selectedCommunityId, setSelectedCommunityId] = useState(defaultCommunityId)
  const hasMultipleCommunities = activeCommunityIds.length > 1

  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN'
  const isUnrestricted = UNRESTRICTED_ROLES.includes(user?.globalRole ?? '') || UNRESTRICTED_ROLES.includes(user?.role ?? '')

  const { data: communityData } = useCommunity(selectedCommunityId)
  const updateCommunity = useUpdateCommunity(selectedCommunityId)

  const gateSettings = (communityData as any)?.settings as Record<string, any> | undefined
  const gateLat = gateSettings?.gateLat as number | undefined
  const gateLng = gateSettings?.gateLng as number | undefined
  const hasGateLocation = typeof gateLat === 'number' && typeof gateLng === 'number'

  // ── Request location permission (Android) ────────────────────
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      )
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    return true // iOS handled at app level
  }, [])

  // ── Get current position (Promise wrapper) ────────────────────
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }),
    )
  }, [])

  // ── Pin current location as gate (super admin only) ──────────
  const pinGateLocation = useCallback(async () => {
    setPinningLocation(true)
    try {
      const ok = await requestLocationPermission()
      if (!ok) {
        Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a ubicación.')
        return
      }
      const pos = await getCurrentPosition()
      await updateCommunity.mutateAsync({
        settings: {
          ...gateSettings,
          gateLat: pos.coords.latitude,
          gateLng: pos.coords.longitude,
        },
      } as any)
      Alert.alert('✅ Listo', `Ubicación del portón guardada.\n${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`)
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicación.')
    } finally {
      setPinningLocation(false)
    }
  }, [gateSettings, updateCommunity, requestLocationPermission, getCurrentPosition])

  // ── Check distance before sending gate command ────────────────
  const sendGateCommand = useCallback(async (type: 'entry' | 'exit') => {
    if (!selectedCommunityId) return

    // Residents and guards must be within range
    if (!isUnrestricted) {
      if (!hasGateLocation) {
        setGateMsg({ text: '⚠ El administrador aún no ha configurado la ubicación del portón', ok: false })
        setTimeout(() => setGateMsg(null), 4000)
        return
      }

      const ok = await requestLocationPermission()
      if (!ok) {
        setGateMsg({ text: '❌ Necesitas permitir acceso a ubicación', ok: false })
        setTimeout(() => setGateMsg(null), 4000)
        return
      }

      const pos = await getCurrentPosition()
      const distance = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, gateLat!, gateLng!)

      if (distance > GATE_RADIUS_METERS) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setGateMsg({ text: `❌ Debes estar en el portón (estás a ${Math.round(distance)}m)`, ok: false })
        setTimeout(() => setGateMsg(null), 5000)
        return
      }
    }

    setGateLoading(type)
    setGateMsg(null)
    try {
      if (type === 'entry') {
        await gateService.openEntry(selectedCommunityId)
      } else {
        await gateService.openExit(selectedCommunityId)
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
  }, [selectedCommunityId, isUnrestricted, hasGateLocation, gateLat, gateLng, requestLocationPermission, getCurrentPosition])

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (isProcessing || lastScannedRef.current === data) return
      lastScannedRef.current = data
      setIsProcessing(true)
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
      cooldownRef.current = setTimeout(() => { lastScannedRef.current = null }, 3000)
      try {
        const result = await scanQR({ qrToken: data, type: entryType })
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setScanResult({ success: true, message: `${entryType === 'ENTRY' ? 'Entry' : 'Exit'} granted`, visitorName: result.pass.visitorName, timestamp: new Date() })
      } catch (err: any) {
        Vibration.vibrate([0, 200, 100, 200])
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setScanResult({ success: false, message: err?.response?.data?.message ?? 'Access denied', timestamp: new Date() })
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

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <Text className="text-white text-2xl font-bold">Gate Control</Text>
        <View className="flex-row bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <TouchableOpacity onPress={() => setMode('scanner')} className={`px-3 py-1.5 ${mode === 'scanner' ? 'bg-primary-500' : ''}`}>
            <Ionicons name="scan-outline" size={18} color={mode === 'scanner' ? 'white' : '#64748B'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('log')} className={`px-3 py-1.5 ${mode === 'log' ? 'bg-primary-500' : ''}`}>
            <Ionicons name="list-outline" size={18} color={mode === 'log' ? 'white' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Gate open buttons ─────────────────────────── */}
      <View className="mx-6 mb-4 bg-surface-card border border-surface-border rounded-2xl p-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-surface-muted text-xs font-semibold uppercase tracking-wider">Abrir puerta</Text>
          {/* Location status badge */}
          {!isUnrestricted && (
            <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${hasGateLocation ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
              <Ionicons name="location-outline" size={10} color={hasGateLocation ? '#10B981' : '#F59E0B'} />
              <Text className={`text-xs ${hasGateLocation ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasGateLocation ? `±${GATE_RADIUS_METERS}m` : 'Sin configurar'}
              </Text>
            </View>
          )}
          {/* Pin location button (super admin only) */}
          {isSuperAdmin && (
            <TouchableOpacity onPress={pinGateLocation} disabled={pinningLocation} className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/10">
              {pinningLocation
                ? <ActivityIndicator size={10} color="#3B82F6" />
                : <Ionicons name="pin-outline" size={10} color="#3B82F6" />}
              <Text className="text-xs text-primary-400">{hasGateLocation ? 'Refijar portón' : 'Fijar portón'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {hasMultipleCommunities && (
          <View className="flex-row flex-wrap gap-2">
            {activeCommunityIds.map((id) => {
              const name = communities.find((c: any) => c.id === id)?.name ?? id
              const isSelected = selectedCommunityId === id
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setSelectedCommunityId(id)}
                  className={`px-3 py-1.5 rounded-full border ${isSelected ? 'bg-primary-500 border-primary-500' : 'bg-surface border-surface-border'}`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-surface-muted'}`}>{name}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => sendGateCommand('entry')}
            disabled={!!gateLoading}
            className="flex-1 flex-row items-center justify-center gap-2 bg-emerald-600 active:bg-emerald-700 py-3 rounded-xl"
          >
            {gateLoading === 'entry' ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="enter-outline" size={18} color="white" />}
            <Text className="text-white font-bold text-sm">Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sendGateCommand('exit')}
            disabled={!!gateLoading}
            className="flex-1 flex-row items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 py-3 rounded-xl"
          >
            {gateLoading === 'exit' ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="exit-outline" size={18} color="white" />}
            <Text className="text-white font-bold text-sm">Salida</Text>
          </TouchableOpacity>
        </View>
        {gateMsg && (
          <Text className={`text-xs text-center font-medium ${gateMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{gateMsg.text}</Text>
        )}
      </View>

      {mode === 'scanner' ? (
        <>
          <View className="flex-row mx-6 mb-4 bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
            <TouchableOpacity onPress={() => setEntryType('ENTRY')} className={`flex-1 flex-row items-center justify-center py-3 gap-2 ${entryType === 'ENTRY' ? 'bg-emerald-500/20' : ''}`}>
              <Ionicons name="enter-outline" size={18} color={entryType === 'ENTRY' ? '#10B981' : '#64748B'} />
              <Text className={`font-semibold ${entryType === 'ENTRY' ? 'text-emerald-400' : 'text-surface-muted'}`}>Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEntryType('EXIT')} className={`flex-1 flex-row items-center justify-center py-3 gap-2 ${entryType === 'EXIT' ? 'bg-orange-500/20' : ''}`}>
              <Ionicons name="exit-outline" size={18} color={entryType === 'EXIT' ? '#F59E0B' : '#64748B'} />
              <Text className={`font-semibold ${entryType === 'EXIT' ? 'text-orange-400' : 'text-surface-muted'}`}>Exit</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 mx-6 rounded-3xl overflow-hidden relative">
            {!cameraPermission || !cameraPermission.granted ? (
              <View className="flex-1 items-center justify-center bg-surface-card gap-4 px-8">
                <Ionicons name="camera-outline" size={56} color="#334155" />
                <Text className="text-white text-lg font-bold text-center">Permiso de cámara requerido</Text>
                <Text className="text-surface-muted text-center text-sm">Necesario para escanear QR de visitantes.</Text>
                <TouchableOpacity onPress={requestCameraPermission} className="bg-primary-500 px-8 py-3 rounded-2xl">
                  <Text className="text-white font-semibold">Conceder permiso</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanResult ? undefined : handleBarCodeScanned}
                />
                {!scanResult && (
                  <View className="absolute inset-0 items-center justify-center">
                    <View className="w-56 h-56 border-2 border-white/60 rounded-2xl" />
                    <Text className="text-white/70 text-sm mt-4 text-center">
                      {isProcessing ? 'Processing...' : 'Point camera at visitor QR code'}
                    </Text>
                  </View>
                )}
                {scanResult && <ResultOverlay result={scanResult} onDismiss={dismissResult} />}
              </>
            )}
          </View>
          <View className="h-6" />
        </>
      ) : (
        <FlatList
          data={eventsData?.events ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventRow event={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchEvents} tintColor="#3B82F6" />}
          ListHeaderComponent={
            <View className="flex-row items-center justify-between py-3 mb-1">
              <Text className="text-surface-muted text-sm">{eventsData?.total ?? 0} events today</Text>
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

import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { Alert } from 'react-native'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://192.168.1.76:3000'

export type ReportType = 'access' | 'payments' | 'reservations' | 'visitors' | 'summary'

const REPORT_LABELS: Record<ReportType, string> = {
  access:       'Accesos',
  payments:     'Pagos',
  reservations: 'Reservaciones',
  visitors:     'Visitantes',
  summary:      'Resumen general',
}

export async function downloadAndShareCSV(
  communityId: string,
  type: ReportType,
  from?: string,
  to?: string,
) {
  const token = await AsyncStorage.getItem('access-token')
  if (!token) throw new Error('Sin sesión activa')

  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to)   params.set('to', to)

  const url = `${API_URL}/api/v1/communities/${communityId}/admin/csv/${type}?${params.toString()}`

  const filename = `${type}_${communityId}_${new Date().toISOString().slice(0, 10)}.csv`
  const fileUri  = FileSystem.cacheDirectory + filename

  const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (downloadResult.status !== 200) {
    throw new Error(`Error al descargar reporte (${downloadResult.status})`)
  }

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) {
    Alert.alert('Descargado', `El archivo fue guardado en: ${fileUri}`)
    return
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: `Reporte de ${REPORT_LABELS[type]}`,
    UTI: 'public.comma-separated-values-text',
  })
}

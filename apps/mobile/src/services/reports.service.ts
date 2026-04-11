import { Share } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

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

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`Error al descargar reporte (${res.status})`)

  const csv = await res.text()

  await Share.share({
    title:   `Reporte ${REPORT_LABELS[type]}`,
    message: csv,
  })
}

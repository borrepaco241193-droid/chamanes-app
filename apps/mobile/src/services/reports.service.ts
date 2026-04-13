import { Share, Alert } from 'react-native'
import * as SecureStore from 'expo-secure-store'
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
  const token = await SecureStore.getItemAsync('access-token')
  if (!token) throw new Error('Sin sesión activa')

  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to)   params.set('to', to)

  const url = `${API_URL}/api/v1/communities/${communityId}/admin/csv/${type}?${params.toString()}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`Error del servidor (${res.status})`)

  const csv = await res.text()
  const label = REPORT_LABELS[type]
  const date  = new Date().toISOString().slice(0, 10)

  await Share.share({
    title:   `Reporte ${label} — ${date}`,
    message: csv,
  })
}

import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useAuthStore } from '../../src/stores/auth.store'
import { downloadAndShareCSV, type ReportType } from '../../src/services/reports.service'

// ── Date range picker (simple month selector) ─────────────────

function getMonthRange(offset: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 10)
  const label = d.toLocaleString('es-MX', { month: 'long', year: 'numeric' })
  return { from, to, label }
}

const MONTHS = [0, -1, -2, -3].map(getMonthRange)

// ── Report Card ───────────────────────────────────────────────

interface ReportDef {
  type: ReportType
  icon: string
  color: string
  label: string
  sub: string
}

const REPORTS: ReportDef[] = [
  { type: 'summary',      icon: 'stats-chart-outline',   color: '#3B82F6', label: 'Resumen general',    sub: 'Ingresos, accesos, reservaciones y pases en un vistazo' },
  { type: 'payments',     icon: 'card-outline',           color: '#10B981', label: 'Pagos',              sub: 'Historial completo de cobros, montos y estados' },
  { type: 'access',       icon: 'key-outline',            color: '#F59E0B', label: 'Registro de accesos',sub: 'Entradas, salidas y accesos denegados por la puerta' },
  { type: 'reservations', icon: 'calendar-outline',       color: '#8B5CF6', label: 'Reservaciones',      sub: 'Áreas reservadas, fechas, estados y cobros' },
  { type: 'visitors',     icon: 'qr-code-outline',        color: '#F43F5E', label: 'Visitantes y pases', sub: 'Pases generados, usos y accesos de visitantes' },
]

function ReportCard({ report, onDownload, loading }: {
  report: ReportDef
  onDownload: (type: ReportType) => void
  loading: boolean
}) {
  return (
    <View style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: `${report.color}20`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={report.icon as any} size={22} color={report.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{report.label}</Text>
        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{report.sub}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onDownload(report.type)}
        disabled={loading}
        style={{ backgroundColor: loading ? '#334155' : `${report.color}20`, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: loading ? '#334155' : `${report.color}40` }}
      >
        {loading
          ? <ActivityIndicator size="small" color={report.color} />
          : <Ionicons name="download-outline" size={18} color={report.color} />}
      </TouchableOpacity>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function ReportsScreen() {
  const user = useAuthStore((s) => s.user)
  const communityId = user?.communityId ?? ''
  const isAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'SUPER_ADMIN' || user?.communityRole === 'COMMUNITY_ADMIN' || user?.communityRole === 'MANAGER'

  const [selectedMonth, setSelectedMonth] = useState(0) // index into MONTHS
  const [loadingType, setLoadingType] = useState<ReportType | null>(null)

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="lock-closed-outline" size={48} color="#334155" />
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso restringido</Text>
      </SafeAreaView>
    )
  }

  async function handleDownload(type: ReportType) {
    if (!communityId) return Alert.alert('Error', 'No hay comunidad activa')
    const { from, to, label } = MONTHS[selectedMonth]
    setLoadingType(type)
    try {
      await downloadAndShareCSV(communityId, type, from, to)
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo descargar el reporte')
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Reportes CSV</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>Descarga y comparte como hoja de cálculo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

        {/* Month selector */}
        <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>PERÍODO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity key={i} onPress={() => setSelectedMonth(i)}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
                  borderColor: selectedMonth === i ? '#3B82F6' : '#334155',
                  backgroundColor: selectedMonth === i ? '#3B82F620' : '#1E293B' }}>
                <Text style={{ color: selectedMonth === i ? '#3B82F6' : '#94A3B8', fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Info banner */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 20 }}>
          <Ionicons name="information-circle-outline" size={18} color="#3B82F6" style={{ marginTop: 1 }} />
          <Text style={{ color: '#94A3B8', fontSize: 12, flex: 1, lineHeight: 18 }}>
            {Platform.OS === 'ios'
              ? 'Los archivos CSV se abrirán con el menú de compartir para guardar en Files, enviar por correo o importar a Numbers/Excel.'
              : 'Los archivos CSV se compartirán para abrirlos en Excel, Google Sheets o cualquier app compatible.'}
          </Text>
        </View>

        {/* Report cards */}
        <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>REPORTES DISPONIBLES</Text>
        {REPORTS.map((r) => (
          <ReportCard
            key={r.type}
            report={r}
            onDownload={handleDownload}
            loading={loadingType === r.type}
          />
        ))}

      </ScrollView>
    </SafeAreaView>
  )
}

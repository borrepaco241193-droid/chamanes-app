import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useAuthStore } from '../../src/stores/auth.store'
import { useAssignCommunityMember } from '../../src/hooks/useCommunity'
import { reservationService } from '../../src/services/reservation.service'
import type { CommonArea } from '../../src/services/reservation.service'

const { width: SCREEN_W } = Dimensions.get('window')

// ── Types ─────────────────────────────────────────────────────

type Step = 'welcome' | 'areas' | 'team' | 'done'
const STEPS: Step[] = ['welcome', 'areas', 'team', 'done']

// ── Step indicator ────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {STEPS.map((s, i) => (
        <View key={s} style={{
          width: i === idx ? 20 : 8, height: 8, borderRadius: 4,
          backgroundColor: i <= idx ? '#3B82F6' : '#334155',
        }} />
      ))}
    </View>
  )
}

// ── Preset common areas ───────────────────────────────────────

const PRESET_AREAS: Array<Partial<CommonArea> & { label: string; icon: string; selected?: boolean }> = [
  { label: 'Alberca', icon: '🏊', name: 'Alberca', openTime: '08:00', closeTime: '20:00', slotDurationMins: 60, requiresApproval: false, hasFee: false, feeAmount: 0 },
  { label: 'Salón de eventos', icon: '🎉', name: 'Salón de eventos', openTime: '09:00', closeTime: '22:00', slotDurationMins: 120, requiresApproval: true, hasFee: true, feeAmount: 500 },
  { label: 'Gimnasio', icon: '💪', name: 'Gimnasio', openTime: '06:00', closeTime: '22:00', slotDurationMins: 60, requiresApproval: false, hasFee: false, feeAmount: 0 },
  { label: 'Área BBQ', icon: '🔥', name: 'Área BBQ', openTime: '10:00', closeTime: '21:00', slotDurationMins: 120, requiresApproval: true, hasFee: false, feeAmount: 0 },
  { label: 'Cancha de tenis', icon: '🎾', name: 'Cancha de tenis', openTime: '07:00', closeTime: '21:00', slotDurationMins: 60, requiresApproval: false, hasFee: false, feeAmount: 0 },
  { label: 'Sala de juegos', icon: '🎮', name: 'Sala de juegos', openTime: '10:00', closeTime: '22:00', slotDurationMins: 60, requiresApproval: false, hasFee: false, feeAmount: 0 },
]

// ── Step: Welcome ─────────────────────────────────────────────

function WelcomeStep({ communityName, onNext }: { communityName: string; onNext: () => void }) {
  return (
    <View style={{ flex: 1, padding: 28, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 36 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3B82F640', marginBottom: 24 }}>
          <Text style={{ fontSize: 48 }}>🏘️</Text>
        </View>
        <Text style={{ color: 'white', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
          ¡Bienvenido a{'\n'}{communityName}!
        </Text>
        <Text style={{ color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
          Tu comunidad está lista. Vamos a configurarla en 3 pasos rápidos para que puedas empezar a usarla de inmediato.
        </Text>
      </View>

      {/* What we'll set up */}
      {[
        { icon: 'home-outline', color: '#10B981', label: 'Áreas comunes', sub: 'Alberca, gimnasio, salones…' },
        { icon: 'people-outline', color: '#8B5CF6', label: 'Tu equipo', sub: 'Invitar managers o admins' },
      ].map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${item.color}20`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{item.label}</Text>
            <Text style={{ color: '#64748B', fontSize: 13 }}>{item.sub}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity onPress={onNext} style={{ backgroundColor: '#3B82F6', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24 }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 17 }}>Comenzar configuración</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/(app)/(tabs)')} style={{ marginTop: 14, alignItems: 'center' }}>
        <Text style={{ color: '#475569', fontSize: 14 }}>Omitir por ahora</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Step: Areas ───────────────────────────────────────────────

function AreasStep({ communityId, onNext }: { communityId: string; onNext: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function handleNext() {
    if (selected.size === 0) { onNext(); return }
    setSaving(true)
    try {
      await Promise.all(
        [...selected].map((i) => {
          const area = PRESET_AREAS[i]
          return reservationService.createArea(communityId, {
            name: area.name,
            openTime: area.openTime,
            closeTime: area.closeTime,
            slotDurationMins: area.slotDurationMins,
            requiresApproval: area.requiresApproval,
            hasFee: area.hasFee,
            feeAmount: area.feeAmount,
          })
        }),
      )
      onNext()
    } catch {
      Alert.alert('Error', 'No se pudieron crear algunas áreas. Puedes agregarlas manualmente después.')
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 28, paddingBottom: 16 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Áreas comunes</Text>
        <Text style={{ color: '#64748B', fontSize: 14, lineHeight: 20 }}>
          Selecciona las áreas que tiene tu comunidad. Las podrás editar y agregar más después.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {PRESET_AREAS.map((area, i) => {
            const isSelected = selected.has(i)
            return (
              <TouchableOpacity
                key={i}
                onPress={() => toggle(i)}
                style={{
                  width: (SCREEN_W - 52) / 2,
                  backgroundColor: isSelected ? '#3B82F620' : '#1E293B',
                  borderRadius: 16, padding: 16, borderWidth: 2,
                  borderColor: isSelected ? '#3B82F6' : '#334155',
                  alignItems: 'center', gap: 8,
                }}
              >
                <Text style={{ fontSize: 32 }}>{area.icon}</Text>
                <Text style={{ color: isSelected ? '#3B82F6' : 'white', fontWeight: '600', fontSize: 14, textAlign: 'center' }}>
                  {area.label}
                </Text>
                {isSelected && (
                  <View style={{ position: 'absolute', top: 10, right: 10 }}>
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
        {selected.size > 0 && (
          <Text style={{ color: '#3B82F6', textAlign: 'center', fontSize: 13, marginTop: 16 }}>
            {selected.size} área{selected.size !== 1 ? 's' : ''} seleccionada{selected.size !== 1 ? 's' : ''}
          </Text>
        )}
      </ScrollView>

      <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
        <TouchableOpacity onPress={handleNext} disabled={saving}
          style={{ backgroundColor: '#3B82F6', borderRadius: 16, padding: 18, alignItems: 'center' }}>
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontWeight: '700', fontSize: 17 }}>
                {selected.size > 0 ? 'Crear áreas y continuar' : 'Continuar sin áreas'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Step: Team ────────────────────────────────────────────────

function TeamStep({ communityId, onNext }: { communityId: string; onNext: () => void }) {
  const { mutateAsync: assignMember } = useAssignCommunityMember(communityId)
  const [invites, setInvites] = useState([{ email: '', role: 'MANAGER' as 'MANAGER' | 'COMMUNITY_ADMIN' }])
  const [saving, setSaving] = useState(false)

  function addRow() {
    if (invites.length >= 5) return
    setInvites((prev) => [...prev, { email: '', role: 'MANAGER' }])
  }

  function removeRow(i: number) {
    setInvites((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, key: 'email' | 'role', value: string) {
    setInvites((prev) => prev.map((row, idx) => idx === i ? { ...row, [key]: value } : row))
  }

  async function handleNext() {
    const toInvite = invites.filter((r) => r.email.trim())
    if (toInvite.length === 0) { onNext(); return }

    const invalid = toInvite.find((r) => !r.email.includes('@'))
    if (invalid) {
      Alert.alert('Error', `Correo inválido: ${invalid.email}`)
      return
    }

    setSaving(true)
    let errors = 0
    for (const row of toInvite) {
      try {
        await assignMember({ email: row.email.trim().toLowerCase(), role: row.role })
      } catch {
        errors++
      }
    }
    setSaving(false)

    if (errors > 0) {
      Alert.alert(
        'Aviso',
        `${errors} invitación(es) no se pudieron completar. Verifica que el correo ya esté registrado en Chamanes.`,
        [{ text: 'Continuar', onPress: onNext }],
      )
    } else {
      onNext()
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 28, paddingBottom: 16 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Invita a tu equipo</Text>
        <Text style={{ color: '#64748B', fontSize: 14, lineHeight: 20 }}>
          Agrega managers o admins usando su correo. Deben estar registrados en Chamanes primero.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {invites.map((row, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                value={row.email}
                onChangeText={(v) => updateRow(i, 'email', v)}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 14 }}
              />
              {invites.length > 1 && (
                <TouchableOpacity onPress={() => removeRow(i)}>
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
            {/* Role toggle */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(['MANAGER', 'COMMUNITY_ADMIN'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => updateRow(i, 'role', r)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                    backgroundColor: row.role === r ? '#3B82F620' : '#1E293B',
                    borderWidth: 1, borderColor: row.role === r ? '#3B82F6' : '#334155',
                  }}
                >
                  <Text style={{ color: row.role === r ? '#3B82F6' : '#64748B', fontSize: 12, fontWeight: '600' }}>
                    {r === 'MANAGER' ? 'Manager' : 'Admin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {invites.length < 5 && (
          <TouchableOpacity onPress={addRow} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
            <Text style={{ color: '#3B82F6', fontSize: 14 }}>Agregar otro</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
        <TouchableOpacity onPress={handleNext} disabled={saving}
          style={{ backgroundColor: '#3B82F6', borderRadius: 16, padding: 18, alignItems: 'center' }}>
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontWeight: '700', fontSize: 17 }}>
                {invites.some((r) => r.email.trim()) ? 'Invitar y finalizar' : 'Omitir este paso'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Step: Done ────────────────────────────────────────────────

function DoneStep({ communityName }: { communityName: string }) {
  return (
    <View style={{ flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#10B98140', marginBottom: 28 }}>
        <Ionicons name="checkmark-circle" size={52} color="#10B981" />
      </View>
      <Text style={{ color: 'white', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
        ¡Todo listo!
      </Text>
      <Text style={{ color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 40 }}>
        {communityName} está configurada y lista para usar. Puedes agregar residentes, unidades y más desde el panel de administración.
      </Text>

      {[
        { icon: 'people-add-outline', color: '#3B82F6', text: 'Agrega residentes desde "Residentes"' },
        { icon: 'home-outline', color: '#10B981', text: 'Crea unidades desde "Unidades"' },
        { icon: 'card-outline', color: '#F59E0B', text: 'Genera cuotas mensuales desde Pagos' },
      ].map((tip) => (
        <View key={tip.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, alignSelf: 'stretch' }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${tip.color}20`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={tip.icon as any} size={18} color={tip.color} />
          </View>
          <Text style={{ color: '#94A3B8', fontSize: 13, flex: 1 }}>{tip.text}</Text>
        </View>
      ))}

      <TouchableOpacity
        onPress={() => router.replace('/(app)/(tabs)')}
        style={{ backgroundColor: '#3B82F6', borderRadius: 16, padding: 18, alignItems: 'center', alignSelf: 'stretch', marginTop: 12 }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 17 }}>Ir al panel principal</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ communityId: string; communityName: string }>()
  const communityId = params.communityId ?? ''
  const communityName = decodeURIComponent(params.communityName ?? 'tu comunidad')

  const [step, setStep] = useState<Step>('welcome')

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
        <StepDots current={step} />
        {step !== 'done' && (
          <TouchableOpacity onPress={() => router.replace('/(app)/(tabs)')}>
            <Text style={{ color: '#475569', fontSize: 14 }}>Omitir</Text>
          </TouchableOpacity>
        )}
      </View>

      {step === 'welcome' && <WelcomeStep communityName={communityName} onNext={next} />}
      {step === 'areas'   && <AreasStep communityId={communityId} onNext={next} />}
      {step === 'team'    && <TeamStep communityId={communityId} onNext={next} />}
      {step === 'done'    && <DoneStep communityName={communityName} />}
    </SafeAreaView>
  )
}

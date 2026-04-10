import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useCreateVisitorPass } from '../../../src/hooks/useVisitors'
import { useAuthStore } from '../../../src/stores/auth.store'

// Quick preset options for validity
const DURATION_PRESETS = [
  { label: '1 hour', hours: 1 },
  { label: '4 hours', hours: 4 },
  { label: '8 hours', hours: 8 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
]

const MAX_USES_OPTIONS = ['1', '2', '3', '5', '10']

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-1.5">
        {label}
      </Text>
      {children}
    </View>
  )
}

export default function NewVisitorPassScreen() {
  const { mutateAsync: createPass, isPending } = useCreateVisitorPass()
  const communityId = useAuthStore((s) => s.user?.communityId)

  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [maxUses, setMaxUses] = useState('1')
  const [durationHours, setDurationHours] = useState(4)

  async function handleSubmit() {
    if (!communityId) {
      Alert.alert(
        'No Community',
        'Your account is not linked to a community. Please log out and log in as a resident or guard.',
      )
      return
    }
    if (!visitorName.trim()) {
      Alert.alert('Required', 'Please enter the visitor name')
      return
    }

    const validUntil = addHours(new Date(), durationHours)

    try {
      const pass = await createPass({
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        visitorEmail: visitorEmail.trim() || undefined,
        plateNumber: plateNumber.trim().toUpperCase() || undefined,
        validUntil: validUntil.toISOString(),
        maxUses: parseInt(maxUses) || 1,
        notes: notes.trim() || undefined,
      })
      router.replace(`/(app)/visitor/${pass.id}`)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to create pass')
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface-card items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">New Visitor Pass</Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Warning if no community */}
          {!communityId && (
            <View className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-4 flex-row items-center gap-2">
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
              <Text className="text-red-400 text-sm flex-1">
                Your account has no community assigned. Log out and log in as Resident or Guard.
              </Text>
            </View>
          )}

          {/* Visitor info */}
          <Text className="text-white font-semibold text-base mb-4">Visitor Information</Text>

          <Field label="Full Name *">
            <TextInput
              value={visitorName}
              onChangeText={setVisitorName}
              placeholder="e.g. Juan García"
              placeholderTextColor="#475569"
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            />
          </Field>

          <Field label="Phone Number">
            <TextInput
              value={visitorPhone}
              onChangeText={setVisitorPhone}
              placeholder="+52 555 000 0000"
              placeholderTextColor="#475569"
              keyboardType="phone-pad"
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            />
          </Field>

          <Field label="Email">
            <TextInput
              value={visitorEmail}
              onChangeText={setVisitorEmail}
              placeholder="visitor@email.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            />
          </Field>

          <Field label="Plate Number">
            <TextInput
              value={plateNumber}
              onChangeText={setPlateNumber}
              placeholder="ABC-123"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            />
          </Field>

          {/* Valid duration */}
          <Text className="text-white font-semibold text-base mb-3 mt-2">Valid For</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {DURATION_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.hours}
                onPress={() => setDurationHours(p.hours)}
                className={`px-4 py-2 rounded-full border ${
                  durationHours === p.hours
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-surface-border bg-surface-card'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    durationHours === p.hours ? 'text-white' : 'text-surface-muted'
                  }`}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Expiry preview */}
          <View className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex-row items-center gap-3 mb-4">
            <Ionicons name="time-outline" size={18} color="#3B82F6" />
            <Text className="text-surface-muted text-sm">
              Expires:{' '}
              <Text className="text-white">
                {addHours(new Date(), durationHours).toLocaleDateString('es-MX', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Text>
          </View>

          {/* Max uses */}
          <Text className="text-white font-semibold text-base mb-3">Maximum Scans</Text>
          <View className="flex-row gap-2 mb-4">
            {MAX_USES_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setMaxUses(n)}
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  maxUses === n
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-surface-border bg-surface-card'
                }`}
              >
                <Text
                  className={`font-semibold ${maxUses === n ? 'text-white' : 'text-surface-muted'}`}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Field label="Notes (optional)">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base min-h-[80px]"
            />
          </Field>

          <View className="h-4" />
        </ScrollView>

        {/* Submit */}
        <View className="px-6 pb-6 pt-3 border-t border-surface-border">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isPending}
            className="bg-primary-500 rounded-2xl py-4 items-center"
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Generate QR Pass</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

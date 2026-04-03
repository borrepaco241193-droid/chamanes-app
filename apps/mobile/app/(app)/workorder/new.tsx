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
import { useCreateWorkOrder } from '../../../src/hooks/useWorkOrders'

// ── Config ────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'maintenance', label: 'Mantenimiento', icon: 'construct-outline' },
  { value: 'cleaning',    label: 'Limpieza',       icon: 'sparkles-outline' },
  { value: 'security',   label: 'Seguridad',      icon: 'shield-outline' },
  { value: 'other',      label: 'Otro',            icon: 'ellipsis-horizontal-outline' },
] as const

const PRIORITIES = [
  { value: 'LOW',    label: 'Bajo',    color: '#64748B' },
  { value: 'MEDIUM', label: 'Medio',   color: '#F59E0B' },
  { value: 'HIGH',   label: 'Alto',    color: '#F97316' },
  { value: 'URGENT', label: 'Urgente', color: '#EF4444' },
] as const

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-1.5">
        {label}{required && <Text className="text-red-400"> *</Text>}
      </Text>
      {children}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────

export default function NewWorkOrderScreen() {
  const { mutateAsync: createOrder, isPending } = useCreateWorkOrder()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<typeof CATEGORIES[number]['value']>('maintenance')
  const [priority, setPriority] = useState<typeof PRIORITIES[number]['value']>('MEDIUM')
  const [location, setLocation] = useState('')

  async function handleSubmit() {
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Campo requerido', 'El título debe tener al menos 3 caracteres.')
      return
    }
    if (!description.trim() || description.trim().length < 5) {
      Alert.alert('Campo requerido', 'La descripción debe tener al menos 5 caracteres.')
      return
    }

    try {
      const order = await createOrder({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        location: location.trim() || undefined,
      } as any)
      router.replace(`/(app)/workorder/${order.id}` as any)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo crear la orden de trabajo.')
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
          <Text className="text-white text-xl font-bold">Nueva orden de trabajo</Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Field label="Título" required>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Fuga de agua en baño común"
              placeholderTextColor="#475569"
              maxLength={100}
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            />
          </Field>

          {/* Description */}
          <Field label="Descripción" required>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe el problema con el mayor detalle posible..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base min-h-[100px]"
            />
            <Text className="text-surface-muted text-xs mt-1 text-right">
              {description.length}/1000
            </Text>
          </Field>

          {/* Category */}
          <Field label="Categoría">
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl border ${
                    category === c.value
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-surface-border bg-surface-card'
                  }`}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={16}
                    color={category === c.value ? 'white' : '#64748B'}
                  />
                  <Text className={`text-sm font-medium ${category === c.value ? 'text-white' : 'text-surface-muted'}`}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          {/* Priority */}
          <Field label="Prioridad">
            <View className="flex-row gap-2">
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    priority === p.value
                      ? 'border-transparent'
                      : 'border-surface-border bg-surface-card'
                  }`}
                  style={priority === p.value ? { backgroundColor: `${p.color}30`, borderColor: p.color } : {}}
                  activeOpacity={0.75}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: priority === p.value ? p.color : '#64748B' }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          {/* Location */}
          <Field label="Ubicación (opcional)">
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Ej. Planta baja, estacionamiento, área común..."
              placeholderTextColor="#475569"
              maxLength={100}
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base"
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
              <Text className="text-white font-semibold text-base">Enviar orden</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

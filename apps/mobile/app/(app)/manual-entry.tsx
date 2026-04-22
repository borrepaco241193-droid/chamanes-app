import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import api from '../../src/lib/api'
import { useAuthStore } from '../../src/stores/auth.store'

// ── Photo picker helper ───────────────────────────────────────

async function pickOrTakePhoto(useCamera: boolean): Promise<{ uri: string; mimeType: string } | null> {
  if (useCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.'); return null }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
    if (result.canceled || !result.assets[0]) return null
    const a = result.assets[0]
    return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return null }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false })
    if (result.canceled || !result.assets[0]) return null
    const a = result.assets[0]
    return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }
  }
}

// ── Photo field component ─────────────────────────────────────

function PhotoField({
  label, value, onPick, loading,
}: { label: string; value: string | null; onPick: (camera: boolean) => void; loading?: boolean }) {
  return (
    <View className="mb-4">
      <Text className="text-surface-muted text-xs font-medium mb-1 uppercase tracking-wide">{label}</Text>
      {value ? (
        <View className="relative">
          <Image source={{ uri: value }} className="w-full h-40 rounded-xl" resizeMode="cover" />
          <TouchableOpacity
            onPress={() => onPick(true)}
            className="absolute top-2 right-2 bg-black/60 rounded-full p-2"
          >
            <Ionicons name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => onPick(true)}
            disabled={loading}
            className="flex-1 h-24 rounded-xl border-2 border-dashed border-slate-600 items-center justify-center gap-1"
          >
            {loading ? <ActivityIndicator size="small" color="#94a3b8" /> : (
              <>
                <Ionicons name="camera-outline" size={24} color="#94a3b8" />
                <Text className="text-surface-muted text-xs">Cámara</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onPick(false)}
            disabled={loading}
            className="flex-1 h-24 rounded-xl border-2 border-dashed border-slate-600 items-center justify-center gap-1"
          >
            <Ionicons name="image-outline" size={24} color="#94a3b8" />
            <Text className="text-surface-muted text-xs">Galería</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Field component ───────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, required, keyboardType, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; keyboardType?: any; multiline?: boolean
}) {
  return (
    <View className="mb-4">
      <Text className="text-surface-muted text-xs font-medium mb-1 uppercase tracking-wide">
        {label}{required && <Text className="text-red-400"> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        placeholderTextColor="#475569"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        className={`bg-slate-800 text-white rounded-xl px-4 ${multiline ? 'py-3 min-h-[80px]' : 'py-3.5'} text-sm border border-slate-700`}
        style={{ textAlignVertical: multiline ? 'top' : 'center' }}
      />
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────

export default function ManualEntryScreen() {
  const { activeCommunityIds, user } = useAuthStore()
  const communityId = activeCommunityIds[0] ?? user?.communityId ?? ''

  const [form, setForm] = useState({
    visitorName: '',
    passengers: '',
    unitNumber: '',
    hostName: '',
    ineName: '',
    plateText: '',
    carModel: '',
    carColor: '',
  })

  const [inePhotoUri, setInePhotoUri]     = useState<string | null>(null)
  const [platePhotoUri, setPlatePhotoUri] = useState<string | null>(null)
  const [uploadingIne, setUploadingIne]   = useState(false)
  const [uploadingPlate, setUploadingPlate] = useState(false)
  const [inePhotoUrl, setInePhotoUrl]     = useState<string | null>(null)
  const [platePhotoUrl, setPlatePhotoUrl] = useState<string | null>(null)
  const [submitting, setSubmitting]       = useState(false)

  const f = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

  // ── Upload photo to backend ───────────────────────────────

  async function uploadPhoto(
    photo: { uri: string; mimeType: string },
    setUri: (u: string) => void,
    setUrl: (u: string) => void,
    setLoading: (b: boolean) => void,
  ) {
    setLoading(true)
    setUri(photo.uri)
    try {
      const fd = new FormData()
      fd.append('file', { uri: photo.uri, type: photo.mimeType, name: 'photo.jpg' } as any)
      const { data } = await api.post(
        `/communities/${communityId}/gate/upload-photo`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setUrl(data.url)
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.')
      setUri('')
    } finally {
      setLoading(false)
    }
  }

  async function handleInePick(camera: boolean) {
    const photo = await pickOrTakePhoto(camera)
    if (photo) await uploadPhoto(photo, setInePhotoUri, setInePhotoUrl, setUploadingIne)
  }

  async function handlePlatePick(camera: boolean) {
    const photo = await pickOrTakePhoto(camera)
    if (photo) await uploadPhoto(photo, setPlatePhotoUri, setPlatePhotoUrl, setUploadingPlate)
  }

  // ── Submit ────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.visitorName.trim() || !form.unitNumber.trim() || !form.hostName.trim()) {
      Alert.alert('Campos requeridos', 'Nombre del visitante, número de casa y nombre del anfitrión son obligatorios.')
      return
    }
    if (uploadingIne || uploadingPlate) {
      Alert.alert('Espera', 'Las fotos aún se están subiendo.')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/communities/${communityId}/gate/manual-entry`, {
        visitorName:  form.visitorName.trim(),
        passengers:   form.passengers ? parseInt(form.passengers) : null,
        unitNumber:   form.unitNumber.trim(),
        hostName:     form.hostName.trim(),
        ineName:      form.ineName.trim() || null,
        inePhotoUrl:  inePhotoUrl ?? null,
        plateText:    form.plateText.trim() || null,
        platePhotoUrl: platePhotoUrl ?? null,
        carModel:     form.carModel.trim() || null,
        carColor:     form.carColor.trim() || null,
      })

      Alert.alert(
        '✅ Entrada registrada',
        `${form.visitorName} registrado. La puerta de entrada se abrirá en unos segundos.`,
        [{ text: 'OK', onPress: () => router.back() }],
      )
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo registrar la entrada.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-surface-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">Registro Manual</Text>
          <Text className="text-surface-muted text-xs">Visitante sin cita previa</Text>
        </View>
        <View className="bg-amber-500/20 px-3 py-1 rounded-full">
          <Text className="text-amber-400 text-xs font-semibold">GUARDIA</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Visitor info */}
          <Text className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-3">
            Información del visitante
          </Text>
          <Field label="Nombre del visitante" value={form.visitorName} onChange={f('visitorName')} placeholder="Ej. Juan García" required />
          <Field label="Número de pasajeros" value={form.passengers} onChange={f('passengers')} placeholder="Opcional" keyboardType="number-pad" />

          {/* Destination */}
          <Text className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-3 mt-2">
            Destino
          </Text>
          <Field label="Número de casa / unidad" value={form.unitNumber} onChange={f('unitNumber')} placeholder="Ej. 12, Casa 5, Torre A-201" required />
          <Field label="Nombre del anfitrión" value={form.hostName} onChange={f('hostName')} placeholder="¿Con quién se dirige?" required />

          {/* INE */}
          <Text className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-3 mt-2">
            Identificación (INE)
          </Text>
          <PhotoField
            label="Foto de INE"
            value={inePhotoUri}
            onPick={handleInePick}
            loading={uploadingIne}
          />
          <Field label="Nombre en la INE" value={form.ineName} onChange={f('ineName')} placeholder="Nombre exacto en la credencial" />

          {/* Vehicle */}
          <Text className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-3 mt-2">
            Vehículo (opcional)
          </Text>
          <PhotoField
            label="Foto de placas"
            value={platePhotoUri}
            onPick={handlePlatePick}
            loading={uploadingPlate}
          />
          <Field label="Número de placas" value={form.plateText} onChange={f('plateText')} placeholder="Ej. ABC-123-D" />
          <Field label="Modelo del vehículo" value={form.carModel} onChange={f('carModel')} placeholder="Ej. Toyota Corolla 2020" />
          <Field label="Color del vehículo" value={form.carColor} onChange={f('carColor')} placeholder="Ej. Blanco" />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || uploadingIne || uploadingPlate}
            className={`mt-6 rounded-2xl py-4 items-center ${submitting ? 'bg-primary-700' : 'bg-primary-500'}`}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="enter-outline" size={20} color="white" />
                <Text className="text-white font-bold text-base">Registrar entrada y abrir puerta</Text>
              </View>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

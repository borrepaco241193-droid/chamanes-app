import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Alert, Image, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../../src/lib/api'

// ── Main Screen ───────────────────────────────────────────────

export default function VerifyIdentityScreen() {
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir la foto de tu identificación.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' })
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' })
    }
  }

  async function handleUpload() {
    if (!photo) return
    setUploading(true)
    try {
      const token = await AsyncStorage.getItem('access-token')
      const formData = new FormData()
      formData.append('file', {
        uri: photo.uri,
        type: photo.mimeType,
        name: `id-photo.${photo.mimeType.split('/')[1] ?? 'jpg'}`,
      } as any)

      await api.post('/auth/upload-id', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      })

      setDone(true)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        </View>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>¡Foto enviada!</Text>
        <Text style={{ color: '#64748B', fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
          Tu identificación está siendo revisada por el administrador de la comunidad. Mientras tanto puedes usar la app normalmente.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/(tabs)')}
          style={{ marginTop: 28, backgroundColor: '#3B82F6', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Entrar a la app</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 16 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="shield-checkmark-outline" size={36} color="#3B82F6" />
          </View>
          <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>Verificación de identidad</Text>
          <Text style={{ color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
            Para acceder a todas las funciones de la app, necesitamos verificar tu identidad con una foto de tu identificación oficial.
          </Text>
        </View>

        {/* What is accepted */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' }}>
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>DOCUMENTOS ACEPTADOS</Text>
          {['INE / Credencial de elector', 'Pasaporte vigente', 'Cédula profesional', 'Licencia de conducir'].map((doc) => (
            <View key={doc} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              <Text style={{ color: '#94A3B8', fontSize: 14 }}>{doc}</Text>
            </View>
          ))}
        </View>

        {/* Photo preview or picker */}
        {photo ? (
          <View style={{ marginBottom: 20 }}>
            <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 220, borderRadius: 14, backgroundColor: '#1E293B' }} resizeMode="cover" />
            <TouchableOpacity onPress={() => setPhoto(null)}
              style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#0F172A', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' }}>
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity onPress={takePhoto} style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 14, padding: 18, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' }}>
              <Ionicons name="camera-outline" size={28} color="#3B82F6" />
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickPhoto} style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 14, padding: 18, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' }}>
              <Ionicons name="image-outline" size={28} color="#8B5CF6" />
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>Galería</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Privacy note */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 28 }}>
          <Ionicons name="lock-closed-outline" size={14} color="#475569" style={{ marginTop: 2 }} />
          <Text style={{ color: '#475569', fontSize: 12, flex: 1, lineHeight: 18 }}>
            Tu identificación se almacena de forma segura y solo el administrador de tu comunidad puede verla para verificar tu identidad. No se comparte con terceros.
          </Text>
        </View>

        {/* Upload button */}
        <TouchableOpacity
          onPress={photo ? handleUpload : pickPhoto}
          disabled={uploading}
          style={{ backgroundColor: photo ? '#3B82F6' : '#1E293B', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: photo ? 0 : 1, borderColor: '#334155' }}
        >
          {uploading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: photo ? 'white' : '#64748B', fontWeight: '700', fontSize: 16 }}>
                {photo ? 'Enviar identificación' : 'Seleccionar foto'}
              </Text>}
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          onPress={() => router.replace('/(app)/(tabs)')}
          style={{ marginTop: 14, alignItems: 'center', paddingVertical: 10 }}
        >
          <Text style={{ color: '#475569', fontSize: 13 }}>Hacer esto más tarde</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

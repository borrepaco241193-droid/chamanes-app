import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

export default function VerifyEmailScreen() {
  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
    >
      <Text style={{ fontSize: 64, marginBottom: 24 }}>📧</Text>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
        Verifica tu correo
      </Text>
      <Text style={{ color: '#64748B', textAlign: 'center', marginBottom: 40, lineHeight: 24, fontSize: 16 }}>
        Enviamos un enlace de verificación a tu correo electrónico. Por favor revisa tu bandeja de entrada.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/(auth)/login')}
        style={{ backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 }}
      >
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Volver al inicio</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}

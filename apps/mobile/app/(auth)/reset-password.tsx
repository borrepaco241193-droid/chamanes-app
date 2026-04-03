import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleReset = () => {
    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    router.replace('/(auth)/login')
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
          Nueva contraseña
        </Text>
        <Text style={{ color: '#64748B', marginBottom: 32 }}>
          Elige una contraseña segura para tu cuenta.
        </Text>

        <View style={{ gap: 16 }}>
          {error ? (
            <View style={{ backgroundColor: '#EF444420', borderColor: '#EF4444', borderWidth: 1, borderRadius: 12, padding: 12 }}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}
          <TextInput
            style={{ backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, color: 'white', fontSize: 16 }}
            placeholder="Nueva contraseña"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={{ backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, color: 'white', fontSize: 16 }}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#64748B"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          <TouchableOpacity
            onPress={handleReset}
            style={{ backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Restablecer contraseña</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

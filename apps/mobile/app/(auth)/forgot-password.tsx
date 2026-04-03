import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useForgotPassword } from '../../src/hooks/useAuth'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const forgotPassword = useForgotPassword()

  const handleSubmit = () => {
    if (!email.trim()) return
    forgotPassword.mutate(email.trim().toLowerCase())
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 32 }}>
          <Text style={{ color: '#3B82F6', fontSize: 16 }}>← Regresar</Text>
        </TouchableOpacity>

        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
          Olvide mi contrasena
        </Text>
        <Text style={{ color: '#64748B', marginBottom: 32, lineHeight: 22 }}>
          Escribe tu correo y te enviamos un enlace para restablecer tu contrasena.
        </Text>

        {forgotPassword.isSuccess ? (
          <View style={{ backgroundColor: '#22C55E15', borderColor: '#22C55E', borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 32 }}>📧</Text>
            <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
              Revisa tu correo
            </Text>
            <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 14 }}>
              Si existe una cuenta con ese correo, recibiras el enlace en breve.
            </Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
              <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Volver al login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {forgotPassword.isError && (
              <View style={{ backgroundColor: '#EF444415', borderColor: '#EF4444', borderWidth: 1, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: '#EF4444', textAlign: 'center', fontSize: 14 }}>
                  {forgotPassword.error instanceof Error ? forgotPassword.error.message : 'Ocurrio un error'}
                </Text>
              </View>
            )}
            <TextInput
              style={{ backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, color: 'white', fontSize: 16 }}
              placeholder="tu@correo.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              editable={!forgotPassword.isPending}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={forgotPassword.isPending || !email.trim()}
              style={{ backgroundColor: email.trim() ? '#3B82F6' : '#1E40AF', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
            >
              {forgotPassword.isPending
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Enviar enlace</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

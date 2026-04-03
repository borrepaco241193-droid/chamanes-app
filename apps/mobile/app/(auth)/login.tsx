import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useLogin } from '../../src/hooks/useAuth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const login = useLogin()

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    login.mutate({ email: email.trim().toLowerCase(), password })
  }

  const errorMessage = login.error instanceof Error ? login.error.message : null

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 24,
              backgroundColor: '#3B82F6', alignItems: 'center',
              justifyContent: 'center', marginBottom: 16,
              shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
            }}>
              <Text style={{ color: 'white', fontSize: 40, fontWeight: 'bold' }}>C</Text>
            </View>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', letterSpacing: -0.5 }}>
              Chamanes
            </Text>
            <Text style={{ color: '#64748B', fontSize: 15, marginTop: 4 }}>
              Gated Community Management
            </Text>
          </View>

          {/* Error */}
          {errorMessage ? (
            <View style={{
              backgroundColor: '#EF444415', borderColor: '#EF4444',
              borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20,
            }}>
              <Text style={{ color: '#EF4444', textAlign: 'center', fontSize: 14 }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 }}>
                CORREO ELECTRÓNICO
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#1E293B', borderColor: login.isError ? '#EF4444' : '#334155',
                  borderWidth: 1, borderRadius: 16, paddingHorizontal: 18,
                  paddingVertical: 16, color: 'white', fontSize: 16,
                }}
                placeholder="tu@correo.com"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={(t) => { setEmail(t); login.reset() }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                editable={!login.isPending}
              />
            </View>

            <View>
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 }}>
                CONTRASEÑA
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: '#1E293B', borderColor: login.isError ? '#EF4444' : '#334155',
                    borderWidth: 1, borderRadius: 16, paddingHorizontal: 18,
                    paddingVertical: 16, color: 'white', fontSize: 16, paddingRight: 56,
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={(t) => { setPassword(t); login.reset() }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!login.isPending}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, top: 17 }}
                >
                  <Text style={{ color: '#64748B', fontSize: 18 }}>
                    {showPassword ? '🙈' : '👁'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={{ alignSelf: 'flex-end', marginTop: -4 }}
            >
              <Text style={{ color: '#3B82F6', fontSize: 14 }}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={login.isPending}
              style={{
                backgroundColor: login.isPending ? '#1D4ED8' : '#3B82F6',
                borderRadius: 16, paddingVertical: 17,
                alignItems: 'center', marginTop: 8,
                shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
              }}
            >
              {login.isPending
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontWeight: '700', fontSize: 17 }}>Iniciar sesión</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={{ color: '#334155', textAlign: 'center', fontSize: 12, marginTop: 40 }}>
            Chamanes © 2025 — Plataforma de acceso residencial
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

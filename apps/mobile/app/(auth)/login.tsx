import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'

// Full auth logic implemented in Phase 2
// This is the UI shell

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    setLoading(true)
    setError('')
    // TODO Phase 2: connect to auth store
    setTimeout(() => {
      setLoading(false)
      setError('Auth coming in Phase 2!')
    }, 1000)
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        {/* Logo / Brand */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-3xl bg-primary-500 items-center justify-center mb-4">
            <Text className="text-white text-4xl font-bold">C</Text>
          </View>
          <Text className="text-white text-3xl font-bold">Chamanes</Text>
          <Text className="text-surface-muted text-base mt-1">Gated Community Management</Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          {error ? (
            <View className="bg-danger/20 border border-danger/40 rounded-2xl p-3">
              <Text className="text-danger text-sm text-center">{error}</Text>
            </View>
          ) : null}

          <View>
            <Text className="text-surface-muted text-sm font-medium mb-2">Email</Text>
            <TextInput
              className="bg-surface-card border border-surface-border rounded-2xl px-4 py-4 text-white text-base"
              placeholder="your@email.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View>
            <Text className="text-surface-muted text-sm font-medium mb-2">Password</Text>
            <TextInput
              className="bg-surface-card border border-surface-border rounded-2xl px-4 py-4 text-white text-base"
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            className="self-end -mt-2"
          >
            <Text className="text-primary-400 text-sm">Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-primary-500 rounded-2xl py-4 items-center mt-2 active:bg-primary-600"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text className="text-surface-muted text-center text-xs mt-8">
          Protected by Chamanes Security System
        </Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

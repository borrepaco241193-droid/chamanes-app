import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../stores/auth.store'

// ============================================================
// TermsModal — blocks app access until user accepts T&C
// Shows once per install (persisted in SecureStore via Zustand)
// ============================================================

const TERMS_TEXT = `TÉRMINOS Y CONDICIONES DE USO — CHAMANES APP

Última actualización: Abril 2026

1. ACEPTACIÓN
Al usar esta aplicación aceptas estos términos. Si no estás de acuerdo, no uses el servicio.

2. USO DEL SERVICIO
Esta app es exclusiva para residentes, administradores y personal autorizado del complejo residencial. Está prohibido compartir credenciales o usarla para fines distintos a la gestión del condominio.

3. PRIVACIDAD Y DATOS
Recopilamos información necesaria para el funcionamiento: nombre, correo, unidad, historial de accesos y pagos. Los datos se almacenan de forma segura y no se comparten con terceros sin consentimiento, salvo por obligación legal.

4. ACCESOS Y CONTROL DE PUERTA
Los registros de entrada y salida quedan almacenados y pueden ser consultados por la administración del complejo. El uso indebido puede resultar en la revocación del acceso.

5. PAGOS
Las transacciones procesadas a través de la app están sujetas a las políticas del procesador de pagos. La administración es responsable de los montos generados; Chamanes actúa como plataforma.

6. VISITANTES
Los pases de visitante son responsabilidad del residente que los genera. El residente se hace responsable de las personas a quienes autoriza el acceso.

7. NOTIFICACIONES
Al usar la app autorizas el envío de notificaciones push relacionadas con visitas, pagos, reservaciones y comunicados del complejo. Puedes desactivarlas en la configuración del dispositivo.

8. MODIFICACIONES
Estos términos pueden actualizarse. Te notificaremos de cambios significativos. El uso continuo implica aceptación.

9. CONTACTO
Para dudas o solicitudes: soporte@chamanes.app`

export function TermsModal() {
  const hasAccepted = useAuthStore((s) => s.hasAcceptedTerms)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const acceptTerms = useAuthStore((s) => s.acceptTerms)
  const logout = useAuthStore((s) => s.logout)

  const [checked, setChecked] = useState(false)

  // Only show when logged in and not yet accepted
  if (!isAuthenticated || hasAccepted) return null

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: '#0F172A',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: '90%',
          borderTopWidth: 1,
          borderColor: '#334155',
        }}>
          {/* Header */}
          <View style={{
            padding: 24,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#1E293B',
            alignItems: 'center',
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: '#3B82F620',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Ionicons name="document-text-outline" size={28} color="#3B82F6" />
            </View>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
              Términos y Condiciones
            </Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              Lee y acepta para continuar usando Chamanes
            </Text>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={{ maxHeight: 340 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator
            indicatorStyle="white"
          >
            <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 22 }}>
              {TERMS_TEXT}
            </Text>
          </ScrollView>

          {/* Accept row */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: '#1E293B',
            gap: 12,
          }}>
            <Switch
              value={checked}
              onValueChange={setChecked}
              trackColor={{ false: '#334155', true: '#3B82F6' }}
              thumbColor="white"
            />
            <Text style={{ color: '#CBD5E1', fontSize: 14, flex: 1 }}>
              He leído y acepto los Términos y Condiciones y la Política de Privacidad
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, gap: 10 }}>
            <TouchableOpacity
              onPress={acceptTerms}
              disabled={!checked}
              style={{
                backgroundColor: checked ? '#3B82F6' : '#1E293B',
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: checked ? '#3B82F6' : '#334155',
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                color: checked ? 'white' : '#475569',
                fontWeight: '700',
                fontSize: 16,
              }}>
                Aceptar y continuar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={logout}
              style={{ alignItems: 'center', padding: 10 }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#475569', fontSize: 13 }}>
                No acepto — cerrar sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

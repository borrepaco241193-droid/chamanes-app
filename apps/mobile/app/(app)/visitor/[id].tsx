import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useVisitorPass, useRevokeVisitorPass } from '../../../src/hooks/useVisitors'
import { format } from 'date-fns'
import type { VisitorPassStatus } from '@chamanes/shared'

const STATUS_CONFIG: Record<
  VisitorPassStatus,
  { label: string; color: string; icon: string }
> = {
  ACTIVE: { label: 'Active', color: '#10B981', icon: 'checkmark-circle' },
  USED: { label: 'Used', color: '#94A3B8', icon: 'checkmark-done-circle' },
  EXPIRED: { label: 'Expired', color: '#F59E0B', icon: 'time' },
  REVOKED: { label: 'Revoked', color: '#EF4444', icon: 'close-circle' },
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3 border-b border-surface-border">
      <View className="w-8 items-center">
        <Ionicons name={icon as any} size={16} color="#64748B" />
      </View>
      <Text className="text-surface-muted text-sm w-24">{label}</Text>
      <Text className="text-white text-sm flex-1">{value}</Text>
    </View>
  )
}

export default function VisitorPassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: pass, isLoading } = useVisitorPass(id)
  const { mutateAsync: revokePass, isPending: isRevoking } = useRevokeVisitorPass()

  async function handleShare() {
    if (!pass) return
    try {
      await Share.share({
        message: `Visitor pass for ${pass.visitorName}\nValid until: ${format(new Date(pass.validUntil), 'PPp')}\n\nScan the QR code at the gate.`,
        title: 'Visitor Pass',
      })
    } catch {
      // User cancelled share
    }
  }

  async function handleRevoke() {
    Alert.alert(
      'Revoke Pass',
      `Are you sure you want to revoke the pass for ${pass?.visitorName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokePass({ passId: id })
              Alert.alert('Done', 'Visitor pass has been revoked.')
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to revoke pass')
            }
          },
        },
      ],
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    )
  }

  if (!pass) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <Text className="text-white">Pass not found</Text>
      </SafeAreaView>
    )
  }

  const statusCfg = STATUS_CONFIG[pass.status] ?? STATUS_CONFIG.ACTIVE
  const isActive = pass.status === 'ACTIVE'

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface-card items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Visitor Pass</Text>
        {isActive && (
          <TouchableOpacity onPress={handleShare} className="w-10 h-10 items-center justify-center">
            <Ionicons name="share-outline" size={22} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* QR Code */}
        <View className="items-center px-6 py-6">
          <View className={`p-1 rounded-3xl ${isActive ? 'bg-white' : 'bg-slate-700 opacity-50'}`}>
            {pass.qrCodeImageUrl ? (
              <Image
                source={{ uri: pass.qrCodeImageUrl }}
                style={{ width: 240, height: 240, borderRadius: 16 }}
                resizeMode="contain"
              />
            ) : (
              <View className="w-60 h-60 items-center justify-center">
                <Ionicons name="qr-code-outline" size={80} color="#64748B" />
              </View>
            )}
          </View>

          {/* Status badge */}
          <View
            className="flex-row items-center gap-2 mt-4 px-4 py-2 rounded-full"
            style={{ backgroundColor: `${statusCfg.color}20` }}
          >
            <Ionicons name={statusCfg.icon as any} size={16} color={statusCfg.color} />
            <Text className="font-semibold text-sm" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </Text>
          </View>

          {!isActive && (
            <Text className="text-surface-muted text-sm text-center mt-2">
              This pass can no longer be used at the gate.
            </Text>
          )}
        </View>

        {/* Pass details */}
        <View className="mx-6 bg-surface-card border border-surface-border rounded-2xl px-4 mb-6">
          <InfoRow icon="person-outline" label="Visitor" value={pass.visitorName} />
          {pass.visitorPhone && (
            <InfoRow icon="call-outline" label="Phone" value={pass.visitorPhone} />
          )}
          {pass.plateNumber && (
            <InfoRow icon="car-outline" label="Plate" value={pass.plateNumber} />
          )}
          <InfoRow
            icon="calendar-outline"
            label="Valid From"
            value={format(new Date(pass.validFrom), 'PPp')}
          />
          <InfoRow
            icon="time-outline"
            label="Expires"
            value={format(new Date(pass.validUntil), 'PPp')}
          />
          <InfoRow
            icon="scan-outline"
            label="Uses"
            value={`${pass.usedCount} of ${pass.maxUses}`}
          />
          <InfoRow
            icon="calendar-number-outline"
            label="Created"
            value={format(new Date(pass.createdAt), 'PPp')}
          />
        </View>

        {/* Revoke button */}
        {isActive && (
          <View className="px-6 mb-8">
            <TouchableOpacity
              onPress={handleRevoke}
              disabled={isRevoking}
              className="border border-red-500/40 rounded-2xl py-3.5 items-center"
              activeOpacity={0.8}
            >
              {isRevoking ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text className="text-red-400 font-medium">Revoke Pass</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

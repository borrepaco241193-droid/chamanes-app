import type { PrismaClient } from '@prisma/client'
import { getMessaging, isFirebaseConfigured } from '../../lib/firebase.js'

// ============================================================
// Notification Service
// Handles DB writes + push delivery (FCM and Expo push service)
// Push failures are swallowed — never crash a request for this
// ============================================================

export async function savePushToken(
  prisma: PrismaClient,
  userId: string,
  pushToken: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { pushToken },
  })
}

export async function getNotifications(
  prisma: PrismaClient,
  userId: string,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return {
    notifications,
    total,
    page,
    pages: Math.ceil(total / limit),
    unreadCount,
  }
}

export async function markNotificationRead(
  prisma: PrismaClient,
  notificationId: string,
  userId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  })
}

export async function markAllRead(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
}

// ── Push delivery ─────────────────────────────────────────────

export interface SendPushOptions {
  userIds: string[]
  title: string
  body: string
  type: string
  data?: Record<string, string>
}

export async function sendPushNotification(
  prisma: PrismaClient,
  options: SendPushOptions,
): Promise<void> {
  const { userIds, title, body, type, data = {} } = options

  // Persist notifications to DB for all users regardless of push token
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      body,
      type,
      data: data as object,
    })),
  })

  // Only deliver push if users have tokens
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, pushToken: { not: null } },
    select: { id: true, pushToken: true },
  })

  if (users.length === 0) return

  const tokens = users.map((u) => u.pushToken!)

  // Expo Go uses "ExponentPushToken[...]" tokens — send via Expo push service
  // Production builds use raw FCM tokens — send via Firebase
  const expoTokens = tokens.filter((t) => t.startsWith('ExponentPushToken'))
  const fcmTokens = tokens.filter((t) => !t.startsWith('ExponentPushToken'))

  const payload = { type, ...data }

  await Promise.allSettled([
    fcmTokens.length > 0 && isFirebaseConfigured()
      ? deliverViaFCM(fcmTokens, title, body, payload)
      : Promise.resolve(),
    expoTokens.length > 0
      ? deliverViaExpo(expoTokens, title, body, payload)
      : Promise.resolve(),
  ])
}

async function deliverViaFCM(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  try {
    const messaging = getMessaging()
    await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    })
  } catch (err) {
    console.error('[FCM] Push delivery error:', err)
  }
}

async function deliverViaExpo(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  try {
    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default',
    }))

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    })
  } catch (err) {
    console.error('[Expo Push] Delivery error:', err)
  }
}

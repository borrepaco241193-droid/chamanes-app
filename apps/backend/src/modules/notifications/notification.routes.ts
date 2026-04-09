import type { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { registerPushTokenSchema, sendNotificationSchema } from './notification.schema.js'
import {
  savePushToken,
  getNotifications,
  markNotificationRead,
  markAllRead,
  sendPushNotification,
} from './notification.service.js'

// ============================================================
// Notification Routes
//
//   PUT    /notifications/push-token      — register device token
//   GET    /notifications                 — list my notifications
//   PATCH  /notifications/read-all        — mark all as read
//   PATCH  /notifications/:id/read        — mark one as read
//   POST   /notifications/send            — send push (admin only)
// ============================================================

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Register push token ────────────────────────────────────
  fastify.put(
    '/push-token',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { pushToken } = registerPushTokenSchema.parse(req.body)
      await savePushToken(fastify.prisma, req.user.sub, pushToken)
      return reply.send({ data: { message: 'Push token saved' } })
    },
  )

  // ── List my notifications ──────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const query = req.query as { page?: string; limit?: string }
      const page = Math.max(1, parseInt(query.page ?? '1'))
      const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20')))
      const result = await getNotifications(fastify.prisma, req.user.sub, page, limit)
      return reply.send({ data: result })
    },
  )

  // ── Mark all as read ───────────────────────────────────────
  fastify.patch(
    '/read-all',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      await markAllRead(fastify.prisma, req.user.sub)
      return reply.send({ data: { message: 'All notifications marked as read' } })
    },
  )

  // ── Mark one as read ───────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/:id/read',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      await markNotificationRead(fastify.prisma, req.params.id, req.user.sub)
      return reply.send({ data: { message: 'Notification marked as read' } })
    },
  )

  // ── Send notification (admin only) ────────────────────────
  fastify.post(
    '/send',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN),
      ],
    },
    async (req, reply) => {
      const input = sendNotificationSchema.parse(req.body)
      await sendPushNotification(fastify.prisma, input)
      return reply.code(202).send({ data: { message: 'Notification queued' } })
    },
  )
}

export default notificationRoutes

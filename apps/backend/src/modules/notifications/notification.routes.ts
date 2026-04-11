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

  // ── Seed demo notifications for current user (dev/testing) ──
  fastify.post(
    '/seed-demo',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const userId = req.user.sub
      const now = new Date()
      const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000)
      const daysAgo  = (d: number) => new Date(now.getTime() - d * 86_400_000)

      const demos = [
        { title: 'Visita en puerta',        body: 'Juan Pérez ha llegado a la entrada',                               type: 'visitor_arrived',       isRead: false, createdAt: hoursAgo(1) },
        { title: 'Cuota pendiente',          body: 'Tu cuota de mantenimiento de Abril 2026 ($1,500) vence el día 5', type: 'payment_due',           isRead: false, createdAt: hoursAgo(3) },
        { title: 'Reservación confirmada',   body: 'Tu reservación del Salón de Fiestas fue aprobada',                type: 'reservation_confirmed', isRead: false, createdAt: hoursAgo(6) },
        { title: 'Orden de trabajo URGENTE', body: 'Fuga de agua en baño — Unidad A101. Prioridad URGENTE.',          type: 'work_order',            isRead: false, createdAt: hoursAgo(8) },
        { title: 'Aviso de comunidad',       body: 'Corte de agua el 15 Abr de 9:00 a 13:00 hrs.',                   type: 'announcement',          isRead: true,  createdAt: daysAgo(1)  },
        { title: 'Pago recibido',            body: 'Se confirmó tu pago de $1,500 MXN · Cuota Abril 2026',           type: 'payment_confirmed',     isRead: true,  createdAt: daysAgo(2)  },
      ]

      let created = 0
      for (const d of demos) {
        const exists = await fastify.prisma.notification.findFirst({
          where: { userId, title: d.title, type: d.type },
        })
        if (!exists) {
          await fastify.prisma.notification.create({
            data: { userId, title: d.title, body: d.body, type: d.type, data: {}, isRead: d.isRead, readAt: d.isRead ? d.createdAt : null, createdAt: d.createdAt },
          })
          created++
        }
      }
      return reply.send({ data: { created, message: `${created} demo notifications created` } })
    },
  )

  // ── Send notification (admin only) ────────────────────────
  fastify.post(
    '/send',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
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

import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { createReservationSchema, cancelReservationSchema } from './reservation.schema.js'
import {
  listCommonAreas,
  getAvailableSlots,
  createReservation,
  listReservations,
  cancelReservation,
} from './reservation.service.js'
import { sendPushNotification } from '../notifications/notification.service.js'
import { sendEmail, newReservationEmail, reservationApprovedEmail, reservationChargeEmail } from '../../lib/email.js'

// ============================================================
// Reservation Routes
//
// GET    /communities/:id/common-areas                     — list areas
// POST   /communities/:id/common-areas                     — admin: create area
// PATCH  /communities/:id/common-areas/:areaId             — admin: update area
// DELETE /communities/:id/common-areas/:areaId             — admin: delete area
// GET    /communities/:id/common-areas/:areaId/slots       — available slots
// POST   /communities/:id/reservations                     — create
// GET    /communities/:id/reservations                     — list mine (admin: all)
// DELETE /communities/:id/reservations/:reservationId      — cancel
// PATCH  /communities/:id/reservations/:reservationId/approve — admin approve
// ============================================================

const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]

const reservationRoutes: FastifyPluginAsync = async (fastify) => {
  // ── List common areas ─────────────────────────────────────
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/common-areas',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const areas = await listCommonAreas(fastify.prisma, req.params.communityId)
      return reply.send(areas)
    },
  )

  // ── Admin: create common area ─────────────────────────────
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/common-areas',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const body = req.body as any
      const area = await fastify.prisma.commonArea.create({
        data: {
          communityId: req.params.communityId,
          name: String(body.name),
          description: body.description ? String(body.description) : null,
          capacity: body.capacity ? Number(body.capacity) : null,
          openTime: body.openTime ? String(body.openTime) : null,
          closeTime: body.closeTime ? String(body.closeTime) : null,
          requiresApproval: Boolean(body.requiresApproval ?? false),
          feeAmount: body.feeAmount ? Number(body.feeAmount) : 0,
          isActive: true,
        },
      })
      return reply.code(201).send(area)
    },
  )

  // ── Admin: update common area ─────────────────────────────
  fastify.patch<{ Params: { communityId: string; areaId: string }; Body: unknown }>(
    '/:communityId/common-areas/:areaId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const body = req.body as any
      const area = await fastify.prisma.commonArea.updateMany({
        where: { id: req.params.areaId, communityId: req.params.communityId },
        data: {
          ...(body.name !== undefined       ? { name: String(body.name) }               : {}),
          ...(body.description !== undefined ? { description: body.description }         : {}),
          ...(body.capacity !== undefined   ? { capacity: Number(body.capacity) }        : {}),
          ...(body.openTime !== undefined   ? { openTime: String(body.openTime) }        : {}),
          ...(body.closeTime !== undefined  ? { closeTime: String(body.closeTime) }      : {}),
          ...(body.requiresApproval !== undefined ? { requiresApproval: Boolean(body.requiresApproval) } : {}),
          ...(body.feeAmount !== undefined  ? { feeAmount: Number(body.feeAmount) }      : {}),
          ...(body.isActive !== undefined   ? { isActive: Boolean(body.isActive) }       : {}),
        },
      })
      if (area.count === 0) return reply.code(404).send({ error: 'Area not found' })
      const updated = await fastify.prisma.commonArea.findUnique({ where: { id: req.params.areaId } })
      return reply.send(updated)
    },
  )

  // ── Admin: delete common area ─────────────────────────────
  fastify.delete<{ Params: { communityId: string; areaId: string } }>(
    '/:communityId/common-areas/:areaId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      await fastify.prisma.commonArea.updateMany({
        where: { id: req.params.areaId, communityId: req.params.communityId },
        data: { isActive: false },
      })
      return reply.send({ ok: true })
    },
  )

  // ── Available time slots for a date ──────────────────────
  fastify.get<{
    Params: { communityId: string; areaId: string }
    Querystring: { date: string }
  }>(
    '/:communityId/common-areas/:areaId/slots',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      if (!req.query.date) {
        return reply.code(400).send({ error: 'date query param is required (YYYY-MM-DD)' })
      }
      const result = await getAvailableSlots(
        fastify.prisma,
        req.params.communityId,
        req.params.areaId,
        req.query.date,
      )
      return reply.send(result)
    },
  )

  // ── Create reservation ────────────────────────────────────
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/reservations',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(
          UserRole.RESIDENT,
          UserRole.COMMUNITY_ADMIN,
          UserRole.SUPER_ADMIN,
        ),
      ],
    },
    async (req, reply) => {
      const body = createReservationSchema.parse(req.body)
      const reservation = await createReservation(
        fastify.prisma,
        req.params.communityId,
        req.user.sub,
        body,
      )

      // Email admins + notify — fire and forget
      try {
        const [community, adminUsers, resident] = await Promise.all([
          fastify.prisma.community.findUnique({
            where: { id: req.params.communityId },
            select: { name: true },
          }),
          fastify.prisma.communityUser.findMany({
            where: {
              communityId: req.params.communityId,
              role: { in: [UserRole.COMMUNITY_ADMIN, UserRole.MANAGER] },
            },
            include: { user: { select: { email: true, id: true } } },
          }),
          fastify.prisma.user.findUnique({
            where: { id: req.user.sub },
            select: { firstName: true, lastName: true },
          }),
        ])
        const residentName = resident ? `${resident.firstName} ${resident.lastName}` : 'Un residente'
        const areaName = (reservation as any).commonArea?.name ?? 'Área común'

        const adminIds = adminUsers.map((cu) => cu.user.id)
        if (adminIds.length > 0) {
          await sendPushNotification(fastify.prisma, {
            userIds: adminIds,
            title: 'Nueva reservación pendiente',
            body: `${residentName} solicitó ${areaName}`,
            type: 'reservation',
          }).catch(() => {})
        }

        for (const cu of adminUsers) {
          if (cu.user.email) {
            sendEmail({
              to: cu.user.email,
              subject: `Nueva reservación: ${areaName}`,
              html: newReservationEmail(reservation, community?.name ?? 'la comunidad', areaName, residentName),
            }).catch(() => {})
          }
        }
      } catch { /* non-fatal */ }

      return reply.code(201).send(reservation)
    },
  )

  // ── List reservations ─────────────────────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { upcoming?: string; status?: string; all?: string }
  }>(
    '/:communityId/reservations',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as string[]
      const effectiveRole = req.user.communityRole ?? req.user.role
      let isAdmin = ADMIN_ROLES.includes(effectiveRole) || req.user.role === UserRole.SUPER_ADMIN
      if (!isAdmin) {
        const cu = await fastify.prisma.communityUser.findUnique({
          where: { userId_communityId: { userId: req.user.sub, communityId: req.params.communityId } },
          select: { role: true },
        })
        if (cu && ADMIN_ROLES.includes(cu.role)) isAdmin = true
      }

      const upcoming = req.query.upcoming !== 'false'
      const statusFilter = req.query.status
      const showAll = req.query.all === 'true'

      const reservations = await listReservations(
        fastify.prisma,
        req.params.communityId,
        req.user.sub,
        isAdmin,
        showAll ? false : upcoming,
        statusFilter,
        isAdmin, // hideResidentInfo for non-admins
      )
      return reply.send(reservations)
    },
  )

  // ── Cancel reservation ────────────────────────────────────
  fastify.delete<{ Params: { communityId: string; reservationId: string }; Body: unknown }>(
    '/:communityId/reservations/:reservationId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const body = cancelReservationSchema.parse(req.body ?? {})
      const isAdmin = ([UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN] as string[]).includes(
        req.user.communityRole ?? req.user.role,
      )
      const reservation = await cancelReservation(
        fastify.prisma,
        req.params.communityId,
        req.params.reservationId,
        req.user.sub,
        isAdmin,
        body,
      )
      return reply.send(reservation)
    },
  )

  // ── Admin: approve (with optional extra charge) or reject ─
  fastify.patch<{
    Params: { communityId: string; reservationId: string }
    Body: { approve: boolean; extraCharge?: number; chargeNote?: string }
  }>(
    '/:communityId/reservations/:reservationId/approve',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
      ],
    },
    async (req, reply) => {
      const { approve, extraCharge, chargeNote } = req.body as {
        approve: boolean; extraCharge?: number; chargeNote?: string
      }

      if (!approve) {
        const reservation = await fastify.prisma.reservation.update({
          where: { id: req.params.reservationId, communityId: req.params.communityId },
          data: { status: 'CANCELLED' },
        })
        // Notify resident of rejection
        try {
          await sendPushNotification(fastify.prisma, {
            userIds: [reservation.userId],
            title: 'Reservación rechazada',
            body: 'Tu solicitud de reservación fue rechazada. Contáctanos si tienes dudas.',
            type: 'reservation_confirmed',
            data: { reservationId: reservation.id },
          })
        } catch { /* non-fatal */ }
        return reply.send(reservation)
      }

      // Approve — update status and optionally add extra charge to feeAmount
      const existing = await fastify.prisma.reservation.findFirst({
        where: { id: req.params.reservationId, communityId: req.params.communityId },
      })
      if (!existing) {
        return reply.code(404).send({ error: 'Reservation not found' })
      }

      const newFeeAmount = extraCharge
        ? Number(existing.feeAmount ?? 0) + extraCharge
        : existing.feeAmount

      const reservation = await fastify.prisma.reservation.update({
        where: { id: req.params.reservationId },
        data: {
          status:    'CONFIRMED',
          feeAmount: newFeeAmount,
          ...(chargeNote ? { notes: existing.notes ? `${existing.notes} | Cargo: ${chargeNote}` : `Cargo extra: ${chargeNote}` } : {}),
        },
      })

      // Fetch resident info for notifications
      const [resident, community, commonArea] = await Promise.all([
        fastify.prisma.user.findUnique({
          where: { id: existing.userId },
          select: { firstName: true, lastName: true, email: true },
        }),
        fastify.prisma.community.findUnique({
          where: { id: req.params.communityId },
          select: { name: true, currency: true },
        }),
        fastify.prisma.commonArea.findUnique({
          where: { id: existing.commonAreaId },
          select: { name: true },
        }),
      ])

      const areaName = commonArea?.name ?? 'área común'
      const residentName = resident ? `${resident.firstName} ${resident.lastName}` : 'Residente'

      // If extra charge was added, create a payment record and notify with charge details
      if (extraCharge && extraCharge > 0) {
        const unitResident = await fastify.prisma.communityUser.findFirst({
          where: { userId: existing.userId, communityId: req.params.communityId },
          include: { unitResidents: { where: { isPrimary: true }, select: { unitId: true }, take: 1 } },
        })
        const unitId = unitResident?.unitResidents[0]?.unitId
        if (unitId) {
          await fastify.prisma.payment.create({
            data: {
              communityId: req.params.communityId,
              userId:      existing.userId,
              unitId,
              amount:      extraCharge,
              currency:    community?.currency ?? 'MXN',
              type:        'OTHER' as any,
              description: chargeNote
                ? `Cargo por reservación: ${chargeNote}`
                : 'Cargo extra por reservación de área común',
              status:  'PENDING',
              dueDate: existing.startTime,
            },
          })
        }

        // Push notification with deep-link to payments tab
        sendPushNotification(fastify.prisma, {
          userIds: [existing.userId],
          title: '✅ Reservación aprobada — cargo pendiente',
          body: `${areaName} aprobada. Cargo de $${extraCharge.toLocaleString()} MXN por pagar.`,
          type: 'reservation_charge',
          data: { reservationId: existing.id, communityId: req.params.communityId, screen: 'payments' },
        }).catch(() => {})

        // Email with charge details
        if (resident?.email) {
          sendEmail({
            to: resident.email,
            subject: `Reservación aprobada con cargo — ${areaName}`,
            html: reservationChargeEmail(
              residentName,
              areaName,
              existing.startTime,
              existing.endTime,
              extraCharge,
              community?.currency ?? 'MXN',
              chargeNote,
            ),
          }).catch(() => {})
        }
      } else {
        // Simple confirmation — no charge
        sendPushNotification(fastify.prisma, {
          userIds: [existing.userId],
          title: '✅ Reservación confirmada',
          body: `Tu reservación de ${areaName} fue aprobada.`,
          type: 'reservation_confirmed',
          data: { reservationId: existing.id, communityId: req.params.communityId },
        }).catch(() => {})

        if (resident?.email) {
          sendEmail({
            to: resident.email,
            subject: `Reservación confirmada — ${areaName}`,
            html: reservationApprovedEmail(residentName, areaName, existing.startTime, existing.endTime),
          }).catch(() => {})
        }
      }

      return reply.send(reservation)
    },
  )
}

export default reservationRoutes

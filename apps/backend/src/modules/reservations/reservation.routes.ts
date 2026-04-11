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

// ============================================================
// Reservation Routes
//
// GET    /communities/:id/common-areas                     — list areas
// GET    /communities/:id/common-areas/:areaId/slots       — available slots
// POST   /communities/:id/reservations                     — create
// GET    /communities/:id/reservations                     — list mine (admin: all)
// DELETE /communities/:id/reservations/:reservationId      — cancel
// PATCH  /communities/:id/reservations/:reservationId/approve — admin approve
// ============================================================

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

      // Notify resident of confirmed reservation
      try {
        await sendPushNotification(fastify.prisma, {
          userIds: [existing.userId],
          title: 'Reservación confirmada',
          body: `Tu reservación${existing.notes ? ` (${existing.notes.split('|')[0].trim()})` : ''} ha sido aprobada`,
          type: 'reservation_confirmed',
          data: { reservationId: existing.id, communityId: req.params.communityId },
        })
      } catch { /* non-fatal */ }

      // If extra charge was added, create a payment record for the resident
      if (extraCharge && extraCharge > 0) {
        const [community, unitResident] = await Promise.all([
          fastify.prisma.community.findUnique({
            where: { id: req.params.communityId },
            select: { currency: true },
          }),
          fastify.prisma.communityUser.findFirst({
            where: { userId: existing.userId, communityId: req.params.communityId },
            include: { unitResidents: { where: { isPrimary: true }, select: { unitId: true }, take: 1 } },
          }),
        ])

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
      }

      return reply.send(reservation)
    },
  )
}

export default reservationRoutes

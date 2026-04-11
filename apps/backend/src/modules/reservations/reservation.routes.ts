import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { createReservationSchema, cancelReservationSchema } from './reservation.schema.js'
import {
  listCommonAreas,
  getAvailableSlots,
  createReservation,
  listReservations,
  cancelReservation,
  approveReservation,
} from './reservation.service.js'

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

  // ── Admin: approve or reject reservation ─────────────────
  fastify.patch<{
    Params: { communityId: string; reservationId: string }
    Body: { approve: boolean }
  }>(
    '/:communityId/reservations/:reservationId/approve',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
      ],
    },
    async (req, reply) => {
      const { approve } = req.body as { approve: boolean }
      if (approve === false) {
        // Reject = cancel with admin reason
        const reservation = await fastify.prisma.reservation.update({
          where: { id: req.params.reservationId, communityId: req.params.communityId },
          data: { status: 'CANCELLED' },
        })
        return reply.send(reservation)
      }
      const reservation = await approveReservation(
        fastify.prisma,
        req.params.communityId,
        req.params.reservationId,
        req.user.sub,
      )
      return reply.send(reservation)
    },
  )
}

export default reservationRoutes

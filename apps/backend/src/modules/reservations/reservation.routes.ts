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
    Querystring: { upcoming?: string }
  }>(
    '/:communityId/reservations',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const isAdmin = ([UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN] as string[]).includes(
        req.user.communityRole ?? req.user.role,
      )
      const upcoming = req.query.upcoming !== 'false'
      const reservations = await listReservations(
        fastify.prisma,
        req.params.communityId,
        req.user.sub,
        isAdmin,
        upcoming,
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

  // ── Admin: approve reservation ────────────────────────────
  fastify.patch<{ Params: { communityId: string; reservationId: string } }>(
    '/:communityId/reservations/:reservationId/approve',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN),
      ],
    },
    async (req, reply) => {
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

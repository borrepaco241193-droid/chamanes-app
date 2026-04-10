import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { checkInSchema, checkOutSchema } from './staff.schema.js'
import {
  listStaff,
  checkIn,
  checkOut,
  getActiveShift,
  getShiftHistory,
} from './staff.service.js'

const staffRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /communities/:id/staff — admin: list all staff
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/staff',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN),
      ],
    },
    async (req, reply) => {
      const staff = await listStaff(fastify.prisma, req.params.communityId)
      return reply.send(staff)
    },
  )

  // GET /communities/:id/staff/shift — my active shift status
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/staff/shift',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const shift = await getActiveShift(fastify.prisma, req.params.communityId, req.user.sub)
      return reply.send({ activeShift: shift })
    },
  )

  // GET /communities/:id/staff/shifts — shift history
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/staff/shifts',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const shifts = await getShiftHistory(fastify.prisma, req.params.communityId, req.user.sub)
      return reply.send(shifts)
    },
  )

  // POST /communities/:id/staff/checkin
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/staff/checkin',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.STAFF, UserRole.GUARD, UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN),
      ],
    },
    async (req, reply) => {
      const body = checkInSchema.parse(req.body ?? {})
      const shift = await checkIn(fastify.prisma, req.params.communityId, req.user.sub, body)
      return reply.code(201).send(shift)
    },
  )

  // POST /communities/:id/staff/checkout
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/staff/checkout',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.STAFF, UserRole.GUARD, UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN),
      ],
    },
    async (req, reply) => {
      const body = checkOutSchema.parse(req.body ?? {})
      const shift = await checkOut(fastify.prisma, req.params.communityId, req.user.sub, body)
      return reply.send(shift)
    },
  )
}

export default staffRoutes

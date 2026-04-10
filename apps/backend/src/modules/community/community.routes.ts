import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// ============================================================
// Community Routes — CRUD for communities
//
// GET    /                              — list all (SUPER_ADMIN)
// POST   /                             — create community (SUPER_ADMIN)
// GET    /:communityId                 — get community details (any admin)
// PATCH  /:communityId                 — update community (SUPER_ADMIN | COMMUNITY_ADMIN | MANAGER)
// ============================================================

const ADMIN_ROLES: UserRole[] = [UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN]

const createCommunitySchema = z.object({
  name:     z.string().min(1),
  address:  z.string().min(1),
  city:     z.string().min(1),
  state:    z.string().min(1),
  country:  z.string().default('MX'),
  zipCode:  z.string().optional().nullable(),
  phone:    z.string().optional().nullable(),
  email:    z.string().email().optional().nullable(),
  timezone: z.string().default('America/Mexico_City'),
  currency: z.string().default('MXN'),
})

const updateCommunitySchema = createCommunitySchema.partial()

const communityRoutes: FastifyPluginAsync = async (fastify) => {

  // ── List all communities (SUPER_ADMIN) ─────────────────────
  fastify.get<{ Querystring: { search?: string } }>(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { search } = req.query
      const communities = await fastify.prisma.community.findMany({
        where: {
          isActive: true,
          ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        },
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, address: true, city: true, state: true,
          country: true, phone: true, email: true, logoUrl: true,
          timezone: true, currency: true, totalUnits: true, isActive: true, createdAt: true,
        },
      })
      return reply.send({ communities })
    },
  )

  // ── Create community (SUPER_ADMIN) ─────────────────────────
  fastify.post<{ Body: unknown }>(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const body = createCommunitySchema.parse(req.body)
      const creatorId = req.user.sub

      const community = await fastify.prisma.community.create({ data: body })

      // Auto-add creator as COMMUNITY_ADMIN of the new community
      await fastify.prisma.communityUser.create({
        data: {
          userId:      creatorId,
          communityId: community.id,
          role:        UserRole.COMMUNITY_ADMIN,
          isActive:    true,
        },
      })

      return reply.code(201).send(community)
    },
  )

  // ── Get community details (any authenticated admin) ────────
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId } = req.params
      const community = await fastify.prisma.community.findUnique({
        where: { id: communityId },
        select: {
          id: true, name: true, address: true, city: true, state: true,
          country: true, phone: true, email: true, logoUrl: true,
          timezone: true, currency: true, totalUnits: true, isActive: true, settings: true,
        },
      })
      if (!community) {
        return reply.code(404).send({ error: 'NotFound', message: 'Comunidad no encontrada' })
      }
      return reply.send(community)
    },
  )

  // ── Update community (SUPER_ADMIN | COMMUNITY_ADMIN | MANAGER) ─
  fastify.patch<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId } = req.params
      const body = updateCommunitySchema.parse(req.body)

      const community = await fastify.prisma.community.findUnique({ where: { id: communityId } })
      if (!community) {
        return reply.code(404).send({ error: 'NotFound', message: 'Comunidad no encontrada' })
      }

      await fastify.prisma.community.update({ where: { id: communityId }, data: body })
      return reply.send({ ok: true })
    },
  )
}

export default communityRoutes

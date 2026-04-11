import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import {
  createVisitorPassSchema,
  scanQRSchema,
  revokePassSchema,
  type CreateVisitorPassInput,
  type ScanQRInput,
} from './visitor.schema.js'
import {
  createVisitorPass,
  listVisitorPasses,
  getVisitorPass,
  revokeVisitorPass,
  scanQRCode,
  listAccessEvents,
} from './visitor.service.js'

// ============================================================
// Visitor Routes
//
// Resident routes:
//   POST   /communities/:communityId/visitors          — create pass
//   GET    /communities/:communityId/visitors          — list my passes
//   GET    /communities/:communityId/visitors/:passId  — pass detail + QR
//   DELETE /communities/:communityId/visitors/:passId  — revoke pass
//
// Guard routes:
//   POST   /communities/:communityId/visitors/scan     — scan QR at gate
//
// Admin routes:
//   GET    /communities/:communityId/access-events     — full gate log
// ============================================================

const visitorRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Create visitor pass (resident/admin) ──────────────────
  fastify.post<{ Params: { communityId: string }; Body: CreateVisitorPassInput }>(
    '/:communityId/visitors',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(
          UserRole.RESIDENT,
          UserRole.COMMUNITY_ADMIN,
          UserRole.SUPER_ADMIN,
          UserRole.MANAGER,
        ),
      ],
    },
    async (req, reply) => {
      const body = createVisitorPassSchema.parse(req.body)
      const pass = await createVisitorPass(
        fastify.prisma,
        req.params.communityId,
        req.user.sub,
        body,
      )
      return reply.code(201).send(pass)
    },
  )

  // ── List visitor passes ───────────────────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { status?: string; page?: string; limit?: string }
  }>('/:communityId/visitors', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as string[]
    let isAdmin = ADMIN_ROLES.includes(req.user.communityRole ?? req.user.role) || req.user.role === UserRole.SUPER_ADMIN
    if (!isAdmin) {
      const cu = await fastify.prisma.communityUser.findUnique({
        where: { userId_communityId: { userId: req.user.sub, communityId: req.params.communityId } },
        select: { role: true },
      })
      if (cu && ADMIN_ROLES.includes(cu.role)) isAdmin = true
    }

    const result = await listVisitorPasses(
      fastify.prisma,
      req.params.communityId,
      isAdmin ? null : req.user.sub,
      req.query.status as any,
      req.query.page ? parseInt(req.query.page) : 1,
      req.query.limit ? parseInt(req.query.limit) : 20,
    )
    return reply.send(result)
  })

  // ── Get single visitor pass ───────────────────────────────
  fastify.get<{ Params: { communityId: string; passId: string } }>(
    '/:communityId/visitors/:passId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as string[]
      let isAdmin = ADMIN_ROLES.includes(req.user.communityRole ?? req.user.role) || req.user.role === UserRole.SUPER_ADMIN
      if (!isAdmin) {
        const cu = await fastify.prisma.communityUser.findUnique({
          where: { userId_communityId: { userId: req.user.sub, communityId: req.params.communityId } },
          select: { role: true },
        })
        if (cu && ADMIN_ROLES.includes(cu.role)) isAdmin = true
      }
      const pass = await getVisitorPass(
        fastify.prisma,
        req.params.communityId,
        req.params.passId,
        req.user.sub,
        isAdmin,
      )
      return reply.send(pass)
    },
  )

  // ── Revoke visitor pass ───────────────────────────────────
  fastify.delete<{ Params: { communityId: string; passId: string }; Body: { reason?: string } }>(
    '/:communityId/visitors/:passId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const body = revokePassSchema.parse(req.body ?? {})
      const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as string[]
      const isAdmin = ADMIN_ROLES.includes(req.user.communityRole ?? req.user.role) || req.user.role === UserRole.SUPER_ADMIN
      const pass = await revokeVisitorPass(
        fastify.prisma,
        req.params.communityId,
        req.params.passId,
        req.user.sub,
        isAdmin,
        body.reason,
      )
      return reply.send(pass)
    },
  )

  // ── Scan QR at gate (guard only) ──────────────────────────
  fastify.post<{ Params: { communityId: string }; Body: ScanQRInput }>(
    '/:communityId/visitors/scan',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(
          UserRole.GUARD,
          UserRole.COMMUNITY_ADMIN,
          UserRole.SUPER_ADMIN,
        ),
      ],
    },
    async (req, reply) => {
      const body = scanQRSchema.parse(req.body)
      const result = await scanQRCode(
        fastify.prisma,
        fastify.redis,
        req.params.communityId,
        req.user.sub,
        body,
      )
      return reply.send(result)
    },
  )

  // ── Access events log (admin/guard) ───────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { page?: string; limit?: string }
  }>(
    '/:communityId/access-events',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(
          UserRole.GUARD,
          UserRole.COMMUNITY_ADMIN,
          UserRole.SUPER_ADMIN,
          UserRole.MANAGER,
        ),
      ],
    },
    async (req, reply) => {
      const result = await listAccessEvents(
        fastify.prisma,
        req.params.communityId,
        req.query.page ? parseInt(req.query.page) : 1,
        req.query.limit ? parseInt(req.query.limit) : 50,
      )
      return reply.send(result)
    },
  )
}

export default visitorRoutes

import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { getDashboardStats, getPaymentReport, getAccessReport } from './admin.service.js'

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = [
    fastify.authenticate,
    fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
  ]

  // GET /communities/:id/admin/stats — dashboard overview
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/admin/stats',
    { preHandler: adminOnly },
    async (req, reply) => {
      const stats = await getDashboardStats(fastify.prisma, req.params.communityId)
      return reply.send(stats)
    },
  )

  // GET /communities/:id/admin/reports/payments — monthly payment chart
  fastify.get<{ Params: { communityId: string }; Querystring: { months?: string } }>(
    '/:communityId/admin/reports/payments',
    { preHandler: adminOnly },
    async (req, reply) => {
      const months = req.query.months ? parseInt(req.query.months) : 6
      const data = await getPaymentReport(fastify.prisma, req.params.communityId, months)
      return reply.send(data)
    },
  )

  // GET /communities/:id/admin/reports/access — daily access events
  fastify.get<{ Params: { communityId: string }; Querystring: { days?: string } }>(
    '/:communityId/admin/reports/access',
    { preHandler: adminOnly },
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days) : 7
      const data = await getAccessReport(fastify.prisma, req.params.communityId, days)
      return reply.send(data)
    },
  )
}

export default adminRoutes

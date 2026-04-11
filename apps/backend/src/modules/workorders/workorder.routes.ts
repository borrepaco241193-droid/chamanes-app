import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import {
  createWorkOrderSchema,
  updateStatusSchema,
  assignSchema,
  addCommentSchema,
} from './workorder.schema.js'
import {
  createWorkOrder,
  listWorkOrders,
  getWorkOrder,
  updateWorkOrderStatus,
  assignWorkOrder,
  addComment,
} from './workorder.service.js'

const workOrderRoutes: FastifyPluginAsync = async (fastify) => {
  // POST — create
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/work-orders',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const body = createWorkOrderSchema.parse(req.body)
      const order = await createWorkOrder(
        fastify.prisma,
        req.params.communityId,
        req.user.sub,
        body,
      )
      return reply.code(201).send(order)
    },
  )

  // GET — list
  fastify.get<{
    Params: { communityId: string }
    Querystring: { status?: string; page?: string; limit?: string }
  }>(
    '/:communityId/work-orders',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      // GUARD and MANAGER see all work orders, same as COMMUNITY_ADMIN
      const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.GUARD] as string[]
      let isAdmin = ADMIN_ROLES.includes(req.user.communityRole ?? req.user.role) || req.user.role === UserRole.SUPER_ADMIN
      if (!isAdmin) {
        const cu = await fastify.prisma.communityUser.findUnique({
          where: { userId_communityId: { userId: req.user.sub, communityId: req.params.communityId } },
          select: { role: true },
        })
        if (cu && ADMIN_ROLES.includes(cu.role)) isAdmin = true
      }
      const result = await listWorkOrders(
        fastify.prisma,
        req.params.communityId,
        req.user.sub,
        isAdmin,
        req.query.status as any,
        req.query.page ? parseInt(req.query.page) : 1,
        req.query.limit ? parseInt(req.query.limit) : 20,
      )
      return reply.send(result)
    },
  )

  // GET — single
  fastify.get<{ Params: { communityId: string; orderId: string } }>(
    '/:communityId/work-orders/:orderId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const order = await getWorkOrder(
        fastify.prisma,
        req.params.communityId,
        req.params.orderId,
      )
      return reply.send(order)
    },
  )

  // PATCH — update status
  fastify.patch<{ Params: { communityId: string; orderId: string }; Body: unknown }>(
    '/:communityId/work-orders/:orderId/status',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const body = updateStatusSchema.parse(req.body)
      const order = await updateWorkOrderStatus(
        fastify.prisma,
        req.params.communityId,
        req.params.orderId,
        body,
      )
      return reply.send(order)
    },
  )

  // POST — assign to staff (admin only)
  fastify.post<{ Params: { communityId: string; orderId: string }; Body: unknown }>(
    '/:communityId/work-orders/:orderId/assign',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
      ],
    },
    async (req, reply) => {
      const body = assignSchema.parse(req.body)
      const order = await assignWorkOrder(
        fastify.prisma,
        req.params.communityId,
        req.params.orderId,
        body,
      )
      return reply.send(order)
    },
  )

  // POST — add comment
  fastify.post<{ Params: { communityId: string; orderId: string }; Body: unknown }>(
    '/:communityId/work-orders/:orderId/comments',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const body = addCommentSchema.parse(req.body)
      const comment = await addComment(
        fastify.prisma,
        req.params.communityId,
        req.params.orderId,
        req.user.sub,
        body,
      )
      return reply.code(201).send(comment)
    },
  )
}

export default workOrderRoutes

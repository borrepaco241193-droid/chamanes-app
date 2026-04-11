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
import { sendPushNotification } from '../notifications/notification.service.js'
import { sendEmail, newWorkOrderEmail } from '../../lib/email.js'
import { env } from '../../config/env.js'

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

      // Email community admins — fire and forget
      try {
        const [community, adminUsers, reporter] = await Promise.all([
          fastify.prisma.community.findUnique({
            where: { id: req.params.communityId },
            select: { name: true },
          }),
          fastify.prisma.communityUser.findMany({
            where: {
              communityId: req.params.communityId,
              role: { in: [UserRole.COMMUNITY_ADMIN, UserRole.MANAGER] },
            },
            include: { user: { select: { email: true } } },
          }),
          fastify.prisma.user.findUnique({
            where: { id: req.user.sub },
            select: { firstName: true, lastName: true },
          }),
        ])
        const reporterName = reporter ? `${reporter.firstName} ${reporter.lastName}` : 'Un residente'
        for (const cu of adminUsers) {
          if (cu.user.email) {
            sendEmail({
              to: cu.user.email,
              subject: `Nueva orden de trabajo: ${order.title}`,
              html: newWorkOrderEmail(order, community?.name ?? 'la comunidad', reporterName),
            }).catch(() => {})
          }
        }
      } catch { /* non-fatal */ }

      return reply.code(201).send(order)
    },
  )

  // POST — upload photo
  fastify.post<{ Params: { communityId: string; orderId: string } }>(
    '/:communityId/work-orders/:orderId/photos',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const data = await req.file()
      if (!data) return reply.code(400).send({ message: 'No file uploaded' })

      const buffer = await data.toBuffer()
      const ext = data.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
      let photoUrl = ''

      if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_ACCOUNT_ID) {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
        })
        const key = `work-orders/${req.params.orderId}-${Date.now()}.${ext}`
        await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: data.mimetype }))
        photoUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `https://${env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`
      } else {
        photoUrl = `data:${data.mimetype};base64,${buffer.toString('base64')}`
      }

      const updated = await fastify.prisma.workOrder.update({
        where: { id: req.params.orderId, communityId: req.params.communityId },
        data: { imageUrls: { push: photoUrl } },
      })
      return reply.send({ ok: true, url: photoUrl, imageUrls: updated.imageUrls })
    },
  )

  // DELETE — remove photo
  fastify.delete<{ Params: { communityId: string; orderId: string }; Body: { url: string } }>(
    '/:communityId/work-orders/:orderId/photos',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { url } = req.body as { url: string }
      const order = await fastify.prisma.workOrder.findUnique({
        where: { id: req.params.orderId, communityId: req.params.communityId },
        select: { imageUrls: true },
      })
      if (!order) return reply.code(404).send({ message: 'Order not found' })
      const updated = await fastify.prisma.workOrder.update({
        where: { id: req.params.orderId, communityId: req.params.communityId },
        data: { imageUrls: order.imageUrls.filter((u) => u !== url) },
      })
      return reply.send({ ok: true, imageUrls: updated.imageUrls })
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

      // Notify the assigned staff member
      try {
        const staff = await fastify.prisma.staff.findUnique({
          where: { id: body.staffId },
          include: { user: { select: { id: true } } },
        })
        if (staff?.user?.id) {
          await sendPushNotification(fastify.prisma, {
            userIds: [staff.user.id],
            title: 'Nueva orden asignada',
            body: `Se te asignó: ${order.title}${order.location ? ` · ${order.location}` : ''}`,
            type: 'work_order',
            data: { workOrderId: order.id, priority: order.priority },
          })
        }
      } catch { /* non-fatal */ }

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

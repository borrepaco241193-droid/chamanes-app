import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { sendPushNotification } from '../notifications/notification.service.js'

const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  // ── List tasks ────────────────────────────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { status?: string; assigneeId?: string }
  }>(
    '/:communityId/tasks',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { communityId } = req.params
      const { status, assigneeId } = req.query as any
      const effectiveRole = req.user.communityRole ?? req.user.role
      const isAdmin = ADMIN_ROLES.includes(effectiveRole as any)

      const where: any = { communityId }
      if (status && status !== 'ALL') where.status = status
      if (assigneeId) where.assigneeId = assigneeId
      // Non-admin residents only see tasks assigned to them
      if (!isAdmin) where.assigneeId = req.user.sub

      const tasks = await fastify.prisma.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      // Check for approaching deadlines (due within 24h, PENDING/IN_PROGRESS, not yet notified)
      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 3600_000)
      for (const task of tasks) {
        if (
          task.dueDate &&
          task.dueDate <= in24h &&
          task.dueDate > now &&
          !task.notifiedAt &&
          task.status !== 'COMPLETED' &&
          task.status !== 'CANCELLED' &&
          task.assigneeId
        ) {
          const hoursLeft = Math.round((task.dueDate.getTime() - now.getTime()) / 3600_000)
          await sendPushNotification(fastify.prisma, {
            userIds: [task.assigneeId],
            title: `⏰ Tarea próxima a vencer`,
            body: `"${task.title}" vence en ${hoursLeft}h`,
            type: 'announcement',
            data: { taskId: task.id },
          })
          await fastify.prisma.task.update({
            where: { id: task.id },
            data: { notifiedAt: now },
          })
        }
      }

      return reply.send({ tasks })
    },
  )

  // ── Create task ───────────────────────────────────────────
  fastify.post<{
    Params: { communityId: string }
    Body: { title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }
  }>(
    '/:communityId/tasks',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
      ],
    },
    async (req, reply) => {
      const { communityId } = req.params
      const { title, description, priority = 'MEDIUM', assigneeId, dueDate } = req.body as any

      if (!title?.trim()) return reply.code(400).send({ error: 'El título es requerido' })

      const task = await fastify.prisma.task.create({
        data: {
          communityId,
          title: title.trim(),
          description: description?.trim() ?? null,
          priority: priority as any,
          assigneeId: assigneeId ?? null,
          creatorId: req.user.sub,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      // Notify assignee
      if (task.assigneeId) {
        await sendPushNotification(fastify.prisma, {
          userIds: [task.assigneeId],
          title: 'Nueva tarea asignada',
          body: task.title,
          type: 'work_order',
          data: { taskId: task.id },
        })
      }

      return reply.code(201).send({ task })
    },
  )

  // ── Update task (status, priority, dueDate, assignee) ────
  fastify.patch<{
    Params: { communityId: string; taskId: string }
    Body: { status?: string; priority?: string; assigneeId?: string; dueDate?: string; title?: string; description?: string }
  }>(
    '/:communityId/tasks/:taskId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { communityId, taskId } = req.params
      const body = req.body as any
      const effectiveRole = req.user.communityRole ?? req.user.role
      const isAdmin = ADMIN_ROLES.includes(effectiveRole as any)

      const existing = await fastify.prisma.task.findFirst({
        where: { id: taskId, communityId },
      })
      if (!existing) return reply.code(404).send({ error: 'Tarea no encontrada' })

      // Non-admin can only update status of their own tasks
      if (!isAdmin && existing.assigneeId !== req.user.sub) {
        return reply.code(403).send({ error: 'Sin permiso' })
      }

      const updates: any = {}
      if (body.status) {
        updates.status = body.status
        if (body.status === 'COMPLETED') updates.completedAt = new Date()
        if (body.status !== 'COMPLETED') updates.completedAt = null
      }
      if (isAdmin) {
        if (body.priority) updates.priority = body.priority
        if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId || null
        if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null
        if (body.title?.trim()) updates.title = body.title.trim()
        if (body.description !== undefined) updates.description = body.description?.trim() ?? null
        // Reset notifiedAt when due date changes so it can re-notify
        if (body.dueDate !== undefined) updates.notifiedAt = null
      }

      const task = await fastify.prisma.task.update({
        where: { id: taskId },
        data: updates,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      // Notify new assignee if changed
      if (isAdmin && body.assigneeId && body.assigneeId !== existing.assigneeId) {
        await sendPushNotification(fastify.prisma, {
          userIds: [body.assigneeId],
          title: 'Tarea reasignada',
          body: task.title,
          type: 'work_order',
          data: { taskId: task.id },
        })
      }

      return reply.send({ task })
    },
  )

  // ── Delete task ───────────────────────────────────────────
  fastify.delete<{ Params: { communityId: string; taskId: string } }>(
    '/:communityId/tasks/:taskId',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
      ],
    },
    async (req, reply) => {
      const { communityId, taskId } = req.params
      const task = await fastify.prisma.task.findFirst({ where: { id: taskId, communityId } })
      if (!task) return reply.code(404).send({ error: 'Tarea no encontrada' })
      await fastify.prisma.task.delete({ where: { id: taskId } })
      return reply.send({ ok: true })
    },
  )
}

export default taskRoutes

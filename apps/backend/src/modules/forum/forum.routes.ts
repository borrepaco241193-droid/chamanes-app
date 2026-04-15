import { FastifyPluginAsync } from 'fastify'
import { sendPushNotification } from '../notifications/notification.service.js'

// ============================================================
// Forum Routes
//
// GET    /communities/:id/forum              — list posts (paginated)
// POST   /communities/:id/forum              — create post
// DELETE /communities/:id/forum/:postId      — delete post (own or admin)
// POST   /communities/:id/forum/:postId/like — toggle like
// GET    /communities/:id/forum/:postId/comments — list comments
// POST   /communities/:id/forum/:postId/comments — add comment
// DELETE /communities/:id/forum/comments/:commentId — delete comment
// ============================================================

const ADMIN_ROLES = ['COMMUNITY_ADMIN', 'SUPER_ADMIN', 'MANAGER']

const forumRoutes: FastifyPluginAsync = async (fastify) => {
  // ── List posts ────────────────────────────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { page?: string; limit?: string }
  }>(
    '/:communityId/forum',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const page = Math.max(1, Number(req.query.page ?? 1))
      const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)))
      const skip = (page - 1) * limit

      const [posts, total] = await Promise.all([
        fastify.prisma.forumPost.findMany({
          where: { communityId: req.params.communityId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            _count: { select: { comments: true, likes: true } },
            likes: { where: { userId: req.user.sub }, select: { id: true } },
          },
        }),
        fastify.prisma.forumPost.count({ where: { communityId: req.params.communityId } }),
      ])

      const enriched = posts.map((p) => ({
        ...p,
        likedByMe: p.likes.length > 0,
        likes: undefined,
      }))

      return reply.send({ posts: enriched, total, page, limit, pages: Math.ceil(total / limit) })
    },
  )

  // ── Create post ───────────────────────────────────────────
  fastify.post<{ Params: { communityId: string }; Body: { body: string; imageUrl?: string } }>(
    '/:communityId/forum',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { body, imageUrl } = req.body as any
      if (!body || String(body).trim().length === 0) {
        return reply.code(400).send({ error: 'El contenido no puede estar vacío' })
      }
      if (String(body).trim().length > 2000) {
        return reply.code(400).send({ error: 'El contenido excede 2000 caracteres' })
      }

      const post = await fastify.prisma.forumPost.create({
        data: {
          communityId: req.params.communityId,
          authorId: req.user.sub,
          body: String(body).trim(),
          imageUrl: imageUrl ? String(imageUrl) : undefined,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { comments: true, likes: true } },
        },
      })

      // Notify all active community members except the author
      try {
        const communityUsers = await fastify.prisma.communityUser.findMany({
          where: { communityId: req.params.communityId, isActive: true, userId: { not: req.user.sub } },
          select: { userId: true },
        })
        const userIds = communityUsers.map((cu) => cu.userId)
        if (userIds.length > 0) {
          await sendPushNotification(fastify.prisma, {
            userIds,
            title: `📢 ${post.author.firstName} publicó en el foro`,
            body: post.body.length > 100 ? post.body.substring(0, 97) + '...' : post.body,
            type: 'announcement',
            data: { postId: post.id, communityId: req.params.communityId },
          })
        }
      } catch { /* never crash a request for push failures */ }

      return reply.code(201).send({ ...post, likedByMe: false })
    },
  )

  // ── Delete post ───────────────────────────────────────────
  fastify.delete<{ Params: { communityId: string; postId: string } }>(
    '/:communityId/forum/:postId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const post = await fastify.prisma.forumPost.findFirst({
        where: { id: req.params.postId, communityId: req.params.communityId },
      })
      if (!post) return reply.code(404).send({ error: 'Post no encontrado' })

      const effectiveRole = req.user.communityRole ?? req.user.role
      const isAdmin = ADMIN_ROLES.includes(effectiveRole)
      if (post.authorId !== req.user.sub && !isAdmin) {
        return reply.code(403).send({ error: 'Sin permiso para eliminar este post' })
      }

      await fastify.prisma.forumPost.delete({ where: { id: req.params.postId } })
      return reply.send({ ok: true })
    },
  )

  // ── Toggle like ───────────────────────────────────────────
  fastify.post<{ Params: { communityId: string; postId: string } }>(
    '/:communityId/forum/:postId/like',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const existing = await fastify.prisma.forumLike.findUnique({
        where: { postId_userId: { postId: req.params.postId, userId: req.user.sub } },
      })

      if (existing) {
        await fastify.prisma.forumLike.delete({ where: { id: existing.id } })
        await fastify.prisma.forumPost.update({
          where: { id: req.params.postId },
          data: { likesCount: { decrement: 1 } },
        })
        return reply.send({ liked: false })
      } else {
        await fastify.prisma.forumLike.create({
          data: { postId: req.params.postId, userId: req.user.sub },
        })
        await fastify.prisma.forumPost.update({
          where: { id: req.params.postId },
          data: { likesCount: { increment: 1 } },
        })
        return reply.send({ liked: true })
      }
    },
  )

  // ── List comments ─────────────────────────────────────────
  fastify.get<{ Params: { communityId: string; postId: string } }>(
    '/:communityId/forum/:postId/comments',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const comments = await fastify.prisma.forumComment.findMany({
        where: { postId: req.params.postId },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })
      return reply.send(comments)
    },
  )

  // ── Add comment ───────────────────────────────────────────
  fastify.post<{ Params: { communityId: string; postId: string }; Body: { body: string } }>(
    '/:communityId/forum/:postId/comments',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { body } = req.body as any
      if (!body || String(body).trim().length === 0) {
        return reply.code(400).send({ error: 'El comentario no puede estar vacío' })
      }

      const comment = await fastify.prisma.forumComment.create({
        data: {
          postId: req.params.postId,
          authorId: req.user.sub,
          body: String(body).trim(),
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })
      return reply.code(201).send(comment)
    },
  )

  // ── Delete comment ────────────────────────────────────────
  fastify.delete<{ Params: { communityId: string; commentId: string } }>(
    '/:communityId/forum/comments/:commentId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const comment = await fastify.prisma.forumComment.findUnique({
        where: { id: req.params.commentId },
      })
      if (!comment) return reply.code(404).send({ error: 'Comentario no encontrado' })

      const effectiveRole = req.user.communityRole ?? req.user.role
      const isAdmin = ADMIN_ROLES.includes(effectiveRole)
      if (comment.authorId !== req.user.sub && !isAdmin) {
        return reply.code(403).send({ error: 'Sin permiso para eliminar este comentario' })
      }

      await fastify.prisma.forumComment.delete({ where: { id: req.params.commentId } })
      return reply.send({ ok: true })
    },
  )
}

export default forumRoutes

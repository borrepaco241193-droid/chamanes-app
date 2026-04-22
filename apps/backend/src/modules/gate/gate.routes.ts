import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'

// ============================================================
// Gate Routes
//
// Resident/Admin:
//   POST /communities/:communityId/gate/open   — queue ENTRY command
//   POST /communities/:communityId/gate/exit   — queue EXIT command
//
// Arduino (API key auth):
//   GET  /communities/:communityId/gate/pending — poll for pending commands (entry + exit separately)
//   POST /communities/:communityId/gate/ack     — mark command executed (body: { type: 'ENTRY'|'EXIT' })
// ============================================================

const GATE_TTL_SECONDS = 120

const gateRoutes: FastifyPluginAsync = async (fastify) => {

  // ── Access event log (admin/manager) ─────────────────────
  fastify.get<{ Params: { communityId: string }; Querystring: { limit?: string; offset?: string } }>(
    '/:communityId/gate/events',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.GUARD)] },
    async (req, reply) => {
      const { communityId } = req.params
      const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit  ?? '50')))
      const offset = Math.max(0, parseInt(req.query.offset ?? '0'))

      const events = await fastify.prisma.accessEvent.findMany({
        where: { communityId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })
      return reply.send({ events, total: events.length, limit, offset })
    },
  )

  // ── Resident triggers gate open (ENTRY) ───────────────────
  fastify.post<{ Params: { communityId: string } }>(
    '/:communityId/gate/open',
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
      const { communityId } = req.params
      const key = `gate:cmd:entry:${communityId}`
      const userId = req.user.sub

      const cmd = JSON.stringify({
        type: 'ENTRY',
        requestedBy: userId,
        requestedAt: new Date().toISOString(),
      })

      await fastify.redis.setex(key, GATE_TTL_SECONDS, cmd)

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, globalRole: true },
      })
      const personName = user ? `${user.firstName} ${user.lastName}` : userId
      const roleToType: Record<string, string> = {
        RESIDENT: 'resident', COMMUNITY_ADMIN: 'admin', MANAGER: 'manager',
        SUPER_ADMIN: 'admin', GUARD: 'guard', STAFF: 'staff',
      }

      await Promise.all([
        fastify.prisma.auditLog.create({ data: { userId, communityId, action: 'gate.open_requested' } }),
        fastify.prisma.accessEvent.create({
          data: {
            communityId,
            type: 'ENTRY',
            method: 'APP',
            personName,
            personType: roleToType[user?.globalRole ?? ''] ?? 'resident',
            isAllowed: true,
          },
        }),
      ])

      return reply.send({ queued: true, expiresIn: GATE_TTL_SECONDS })
    },
  )

  // ── Resident triggers gate exit (EXIT) ────────────────────
  fastify.post<{ Params: { communityId: string } }>(
    '/:communityId/gate/exit',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(
          UserRole.RESIDENT,
          UserRole.COMMUNITY_ADMIN,
          UserRole.SUPER_ADMIN,
          UserRole.GUARD,
        ),
      ],
    },
    async (req, reply) => {
      const { communityId } = req.params
      const key = `gate:cmd:exit:${communityId}`
      const userId = req.user.sub

      const cmd = JSON.stringify({
        type: 'EXIT',
        requestedBy: userId,
        requestedAt: new Date().toISOString(),
      })

      await fastify.redis.setex(key, GATE_TTL_SECONDS, cmd)

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, globalRole: true },
      })
      const personName = user ? `${user.firstName} ${user.lastName}` : userId
      const roleToType: Record<string, string> = {
        RESIDENT: 'resident', COMMUNITY_ADMIN: 'admin', MANAGER: 'manager',
        SUPER_ADMIN: 'admin', GUARD: 'guard', STAFF: 'staff',
      }

      await Promise.all([
        fastify.prisma.auditLog.create({ data: { userId, communityId, action: 'gate.exit_requested' } }),
        fastify.prisma.accessEvent.create({
          data: {
            communityId,
            type: 'EXIT',
            method: 'APP',
            personName,
            personType: roleToType[user?.globalRole ?? ''] ?? 'resident',
            isAllowed: true,
          },
        }),
      ])

      return reply.send({ queued: true, expiresIn: GATE_TTL_SECONDS })
    },
  )

  // ── Arduino polls for pending commands ────────────────────
  // Returns entry and exit states independently so both can be
  // activated simultaneously without one overwriting the other.
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/gate/pending',
    async (req, reply) => {
      const gateKey = req.headers['x-gate-key']
      const expectedKey = process.env.GATE_API_KEY

      if (!expectedKey || gateKey !== expectedKey) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const { communityId } = req.params
      const [entryCmd, exitCmd] = await Promise.all([
        fastify.redis.get(`gate:cmd:entry:${communityId}`),
        fastify.redis.get(`gate:cmd:exit:${communityId}`),
      ])

      return reply.send({
        entry: entryCmd ? { pending: true, command: JSON.parse(entryCmd) } : { pending: false },
        exit:  exitCmd  ? { pending: true, command: JSON.parse(exitCmd)  } : { pending: false },
      })
    },
  )

  // ── Arduino acknowledges command executed ─────────────────
  // Body: { executed: boolean, type: 'ENTRY' | 'EXIT' }
  fastify.post<{ Params: { communityId: string }; Body: { executed: boolean; type?: string } }>(
    '/:communityId/gate/ack',
    async (req, reply) => {
      const gateKey = req.headers['x-gate-key']
      const expectedKey = process.env.GATE_API_KEY

      if (!expectedKey || gateKey !== expectedKey) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const { communityId } = req.params
      const type = req.body?.type ?? 'ENTRY'
      const key = type === 'EXIT'
        ? `gate:cmd:exit:${communityId}`
        : `gate:cmd:entry:${communityId}`

      await fastify.redis.del(key)
      return reply.send({ ok: true })
    },
  )
}

export default gateRoutes

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
//   GET  /communities/:communityId/gate/pending — poll for pending command
//   POST /communities/:communityId/gate/ack     — mark command executed
// ============================================================

const GATE_TTL_SECONDS = 30 // command expires after 30s if not picked up

const gateRoutes: FastifyPluginAsync = async (fastify) => {

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
      const key = `gate:cmd:${communityId}`

      const cmd = JSON.stringify({
        type: 'ENTRY',
        requestedBy: req.user.sub,
        requestedAt: new Date().toISOString(),
      })

      await fastify.redis.setex(key, GATE_TTL_SECONDS, cmd)

      // Log the event
      await fastify.prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          communityId,
          action: 'gate.open_requested',
        },
      })

      return reply.send({ queued: true, expiresIn: GATE_TTL_SECONDS })
    },
  )

  // ── Resident triggers gate exit ───────────────────────────
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
      const key = `gate:cmd:${communityId}`

      const cmd = JSON.stringify({
        type: 'EXIT',
        requestedBy: req.user.sub,
        requestedAt: new Date().toISOString(),
      })

      await fastify.redis.setex(key, GATE_TTL_SECONDS, cmd)

      await fastify.prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          communityId,
          action: 'gate.exit_requested',
        },
      })

      return reply.send({ queued: true, expiresIn: GATE_TTL_SECONDS })
    },
  )

  // ── Arduino polls for pending command (API key auth) ──────
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/gate/pending',
    async (req, reply) => {
      // Validate Arduino API key from X-Gate-Key header
      const gateKey = req.headers['x-gate-key']
      const expectedKey = process.env.GATE_API_KEY

      if (!expectedKey || gateKey !== expectedKey) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const key = `gate:cmd:${req.params.communityId}`
      const cmd = await fastify.redis.get(key)

      if (!cmd) {
        return reply.send({ pending: false })
      }

      return reply.send({ pending: true, command: JSON.parse(cmd) })
    },
  )

  // ── Arduino acknowledges command executed ─────────────────
  fastify.post<{ Params: { communityId: string }; Body: { executed: boolean } }>(
    '/:communityId/gate/ack',
    async (req, reply) => {
      const gateKey = req.headers['x-gate-key']
      const expectedKey = process.env.GATE_API_KEY

      if (!expectedKey || gateKey !== expectedKey) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const key = `gate:cmd:${req.params.communityId}`
      await fastify.redis.del(key)

      return reply.send({ ok: true })
    },
  )
}

export default gateRoutes

import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
          UserRole.GUARD,
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

  // ── Upload a gate photo (INE or plates) ────────────────────
  // POST /:communityId/gate/upload-photo
  // Returns { url } for use in manual-entry form
  fastify.post<{ Params: { communityId: string } }>(
    '/:communityId/gate/upload-photo',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.GUARD, UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const data = await req.file()
      if (!data) return reply.code(400).send({ error: 'No file received' })

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      const { env } = await import('../../config/env.js')
      let url: string

      if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_ACCOUNT_ID) {
        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
        })
        const ext = data.mimetype.split('/')[1] ?? 'jpg'
        const key = `gate-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: data.mimetype }))
        url = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `https://${env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`
      } else {
        url = `data:${data.mimetype};base64,${buffer.toString('base64')}`
      }

      return reply.send({ ok: true, url })
    },
  )

  // ── Register manual visitor (guard) ───────────────────────
  // POST /:communityId/gate/manual-entry
  const manualEntrySchema = z.object({
    visitorName: z.string().min(1),
    passengers:  z.number().int().positive().optional().nullable(),
    unitNumber:  z.string().min(1),
    hostName:    z.string().min(1),
    ineName:     z.string().optional().nullable(),
    inePhotoUrl: z.string().url().optional().nullable(),
    plateText:   z.string().optional().nullable(),
    platePhotoUrl: z.string().url().optional().nullable(),
    carModel:    z.string().optional().nullable(),
    carColor:    z.string().optional().nullable(),
  })

  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/gate/manual-entry',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.GUARD, UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)] },
    async (req, reply) => {
      const { communityId } = req.params
      const userId = req.user.sub
      const body = manualEntrySchema.parse(req.body)

      // Create manual visit record
      const visit = await fastify.prisma.manualVisit.create({
        data: {
          communityId,
          registeredById: userId,
          ...body,
          isInside: true,
        },
      })

      // Log access event
      await fastify.prisma.accessEvent.create({
        data: {
          communityId,
          type: 'ENTRY',
          method: 'MANUAL_GUARD',
          personName: body.visitorName,
          personType: 'visitor',
          plateNumber: body.plateText ?? null,
          isAllowed: true,
          notes: `Manual: Visita a ${body.unitNumber} con ${body.hostName}`,
        },
      })

      // Queue entry gate command
      const cmd = JSON.stringify({ type: 'ENTRY', requestedBy: userId, requestedAt: new Date().toISOString() })
      await fastify.redis.setex(`gate:cmd:entry:${communityId}`, GATE_TTL_SECONDS, cmd)

      return reply.code(201).send({ ok: true, visit })
    },
  )

  // ── List active manual visits ──────────────────────────────
  // GET /:communityId/gate/manual-visits
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/gate/manual-visits',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.GUARD, UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)] },
    async (req, reply) => {
      const { communityId } = req.params
      const visits = await fastify.prisma.manualVisit.findMany({
        where: { communityId },
        orderBy: { entryAt: 'desc' },
        take: 100,
        include: {
          registeredBy: { select: { firstName: true, lastName: true } },
        },
      })
      return reply.send({ visits })
    },
  )

  // ── Register manual exit ───────────────────────────────────
  // POST /:communityId/gate/manual-exit/:visitId
  fastify.post<{ Params: { communityId: string; visitId: string } }>(
    '/:communityId/gate/manual-exit/:visitId',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.GUARD, UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)] },
    async (req, reply) => {
      const { communityId, visitId } = req.params
      const userId = req.user.sub

      const visit = await fastify.prisma.manualVisit.findUnique({ where: { id: visitId } })
      if (!visit || visit.communityId !== communityId) {
        return reply.code(404).send({ error: 'Visit not found' })
      }
      if (!visit.isInside) {
        return reply.code(400).send({ error: 'Visitor already exited' })
      }

      await fastify.prisma.manualVisit.update({
        where: { id: visitId },
        data: { isInside: false, exitAt: new Date() },
      })

      // Log exit event
      await fastify.prisma.accessEvent.create({
        data: {
          communityId,
          type: 'EXIT',
          method: 'MANUAL_GUARD',
          personName: visit.visitorName,
          personType: 'visitor',
          plateNumber: visit.plateText ?? null,
          isAllowed: true,
          notes: `Salida manual: visita a ${visit.unitNumber}`,
        },
      })

      // Queue exit gate command
      const cmd = JSON.stringify({ type: 'EXIT', requestedBy: userId, requestedAt: new Date().toISOString() })
      await fastify.redis.setex(`gate:cmd:exit:${communityId}`, GATE_TTL_SECONDS, cmd)

      return reply.send({ ok: true })
    },
  )
}

export default gateRoutes

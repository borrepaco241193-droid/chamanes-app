import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { UserRole } from '@prisma/client'
import { verifyAccessToken } from '../lib/tokens.js'

// ============================================================
// Auth plugin — manual JWT verification using jsonwebtoken
// Replaces @fastify/jwt to avoid its broken dependency chain
// (asn1.js, steed, etc. not reliably installed in monorepos)
// ============================================================

export interface JWTPayload {
  sub: string
  email: string
  role: UserRole
  communityId?: string
  communityRole?: UserRole
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    user: JWTPayload
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  // Add user placeholder on every request
  fastify.decorateRequest('user', { getter: () => ({} as JWTPayload) })

  // authenticate — verifies Bearer token, sets req.user
  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Missing authorization token' })
      }
      const token = authHeader.slice(7)
      req.user = verifyAccessToken(token)
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown'
      reply.code(401).send({ error: 'Unauthorized', message: `Invalid or expired token: ${reason}` })
    }
  })

  // requireRole — call AFTER authenticate in preHandler array
  fastify.decorate(
    'requireRole',
    (...roles: string[]) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user
        if (!user) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Not authenticated' })
        }
        const effectiveRole = user.communityRole ?? user.role
        if (!roles.includes(effectiveRole) && user.role !== UserRole.SUPER_ADMIN) {
          reply.code(403).send({ error: 'Forbidden', message: 'You do not have permission to perform this action' })
        }
      },
  )
})

export default authPlugin

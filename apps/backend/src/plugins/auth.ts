import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fjwt from '@fastify/jwt'
import { env } from '../config/env.js'
import { UserRole } from '@prisma/client'

// ── JWT payload shape ─────────────────────────────────────────
export interface JWTPayload {
  sub: string          // userId
  email: string
  role: UserRole       // Global role
  communityId?: string // Active community context
  communityRole?: UserRole // Role within that community
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: UserRole[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: JWTPayload
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.register(fjwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  // Middleware: verify JWT on protected routes
  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
    }
  })

  // Middleware: check role after authenticate
  fastify.decorate(
    'requireRole',
    (...roles: UserRole[]) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user
        const effectiveRole = user.communityRole ?? user.role

        if (!roles.includes(effectiveRole) && user.role !== UserRole.SUPER_ADMIN) {
          reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to perform this action',
          })
        }
      },
  )
})

export default authPlugin

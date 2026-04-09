import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './config/env.js'

// Plugins
import prismaPlugin from './plugins/prisma.js'
import redisPlugin from './plugins/redis.js'
import authPlugin from './plugins/auth.js'

// Routes
import healthRoutes from './modules/health/health.routes.js'
import authRoutes from './modules/auth/auth.routes.js'
import communityRoutes from './modules/community/community.routes.js'
import visitorRoutes from './modules/visitors/visitor.routes.js'
import paymentRoutes, { stripeWebhookRoute } from './modules/payments/payment.routes.js'
import reservationRoutes from './modules/reservations/reservation.routes.js'
import staffRoutes from './modules/staff/staff.routes.js'
import workOrderRoutes from './modules/workorders/workorder.routes.js'
import adminRoutes from './modules/admin/admin.routes.js'
import notificationRoutes from './modules/notifications/notification.routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  })

  // ── Security ──────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false })

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
    }),
  })

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  // ── API Docs ──────────────────────────────────────────────
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Chamanes API',
          description: 'Gated community management platform',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    })
    await app.register(swaggerUi, { routePrefix: '/docs' })
  }

  // ── Core Plugins ──────────────────────────────────────────
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(authPlugin)

  // ── Routes ────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(communityRoutes, { prefix: '/api/v1/communities' })
  await app.register(visitorRoutes, { prefix: '/api/v1/communities' })
  await app.register(paymentRoutes, { prefix: '/api/v1/communities' })
  await app.register(reservationRoutes, { prefix: '/api/v1/communities' })
  await app.register(stripeWebhookRoute, { prefix: '/api/v1' })
  await app.register(staffRoutes, { prefix: '/api/v1/communities' })
  await app.register(workOrderRoutes, { prefix: '/api/v1/communities' })
  await app.register(adminRoutes, { prefix: '/api/v1/communities' })
  await app.register(notificationRoutes, { prefix: '/api/v1/notifications' })

  // ── Error handler ─────────────────────────────────────────
  app.setErrorHandler((error, req, reply) => {
    app.log.error({ err: error, url: req.url, method: req.method })

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: JSON.parse(error.message),
      })
    }

    const statusCode = (error as any).statusCode ?? 500
    return reply.code(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : error.message,
      message: statusCode === 500 ? 'Something went wrong' : error.message,
    })
  })

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${req.method} ${req.url} not found`,
    })
  })

  return app
}

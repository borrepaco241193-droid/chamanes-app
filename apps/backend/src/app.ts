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
import gateRoutes from './modules/gate/gate.routes.js'
import residentRoutes from './modules/residents/resident.routes.js'
import forumRoutes from './modules/forum/forum.routes.js'

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

  // ── Security headers ──────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // not needed for a JSON API
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  })

  // ── CORS — allow only known origins ───────────────────────
  const ALLOWED_ORIGINS: (string | RegExp)[] = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : []
  // In development allow localhost on any port
  if (env.NODE_ENV === 'development') {
    ALLOWED_ORIGINS.push(/^http:\/\/localhost(:\d+)?$/, /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/)
  }

  await app.register(cors, {
    origin: (origin, cb) => {
      // Mobile apps (Expo, React Native) send no origin — always allow
      if (!origin) return cb(null, true)
      const allowed =
        env.NODE_ENV === 'development' ||
        ALLOWED_ORIGINS.some((o) =>
          typeof o === 'string' ? o === origin : o.test(origin),
        )
      cb(allowed ? null : new Error('CORS: origin not allowed'), allowed)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version', 'X-Gate-Key'],
  })

  // ── Global rate limit ─────────────────────────────────────
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    keyGenerator: (req) => req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.ip,
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
  await app.register(gateRoutes, { prefix: '/api/v1/communities' })
  await app.register(residentRoutes, { prefix: '/api/v1/communities' })
  await app.register(forumRoutes, { prefix: '/api/v1/communities' })

  // ── Error handler ─────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    const error = err as Error & { statusCode?: number }

    // Never log full errors in production to prevent sensitive data leakage
    if (env.NODE_ENV === 'production') {
      const statusCode = error.statusCode ?? 500
      if (statusCode >= 500) {
        // Log minimal info — no stack trace, no request body
        app.log.error({ statusCode, message: error.message, url: req.url, method: req.method })
      }
    } else {
      app.log.error({ err: error, url: req.url, method: req.method })
    }

    // Zod validation errors — check name OR presence of issues array OR message is JSON array of Zod issues
    const parseZodIssues = (): unknown[] | null => {
      try {
        if (typeof error.message === 'string' && error.message.trimStart().startsWith('[')) {
          const parsed = JSON.parse(error.message)
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) return parsed
        }
      } catch { /* ignore */ }
      return null
    }
    const zodIssuesFromMessage = parseZodIssues()
    const isZodError =
      error.name === 'ZodError' ||
      ('issues' in error && Array.isArray((error as any).issues)) ||
      zodIssuesFromMessage !== null
    if (isZodError) {
      const issues = (error as any).issues ?? zodIssuesFromMessage ?? []
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: issues,
      })
    }

    const statusCode = error.statusCode ?? 500
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      // Never expose internal error details in production
      message: statusCode >= 500 && env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : error.message,
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

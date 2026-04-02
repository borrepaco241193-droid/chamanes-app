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

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true, // Required behind Railway's proxy
    ajv: {
      customOptions: {
        removeAdditional: 'all', // Strip unknown fields from requests
        coerceTypes: true,
        allErrors: true,
      },
    },
  })

  // ── Security ──────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // Swagger UI needs this off in dev
  })

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
    credentials: true,
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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  })

  // ── API Documentation (Swagger) ───────────────────────────
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: { title: 'Chamanes API', description: 'Gated community management platform', version: '1.0.0' },
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

  // ── Global Error Handler ──────────────────────────────────
  app.setErrorHandler((error, req, reply) => {
    app.log.error({ err: error, url: req.url, method: req.method })

    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.validation,
      })
    }

    const statusCode = error.statusCode ?? 500
    return reply.code(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : error.message,
      message: statusCode === 500 ? 'Something went wrong' : error.message,
    })
  })

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: 'Not Found', message: `Route ${req.method} ${req.url} not found` })
  })

  return app
}

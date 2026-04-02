import { FastifyPluginAsync } from 'fastify'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_req, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      fastify.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      fastify.redis.ping().then((res: string) => res === 'PONG').catch(() => false),
    ])

    const status = dbOk && redisOk ? 'ok' : 'degraded'

    return reply.code(status === 'ok' ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
      version: '1.0.0',
    })
  })
}

export default healthRoutes

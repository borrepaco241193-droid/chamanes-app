import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

// Append connection_limit + pool_timeout to DATABASE_URL if not already set.
// This prevents Railway Postgres from accumulating idle connections (each serverless
// restart creates a new pool; without a cap Railway hits the 25-connection limit fast).
function buildDatasourceUrl(): string {
  const base = process.env.DATABASE_URL ?? ''
  if (!base || base.includes('connection_limit')) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}connection_limit=5&pool_timeout=20`
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const prisma = new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  })

  await prisma.$connect()
  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

export default prismaPlugin

import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { createClient, RedisClientType } from 'redis'
import { env } from '../config/env.js'

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType
  }
}

const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const client = createClient({ url: env.REDIS_URL }) as RedisClientType

  client.on('error', (err) => fastify.log.error({ err }, 'Redis error'))
  client.on('connect', () => fastify.log.info('Redis connected'))

  await client.connect()
  fastify.decorate('redis', client)

  fastify.addHook('onClose', async () => {
    await client.quit()
  })
})

export default redisPlugin

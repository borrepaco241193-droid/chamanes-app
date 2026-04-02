import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import fastifyRedis from '@fastify/redis'
import { env } from '../config/env.js'

const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(fastifyRedis, {
    url: env.REDIS_URL,
    closeClient: true,
  })
})

export default redisPlugin

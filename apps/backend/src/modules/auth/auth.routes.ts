import { FastifyPluginAsync } from 'fastify'

// Auth routes — full implementation in Phase 2
const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ping', async () => ({ message: 'Auth module ready — Phase 2 coming soon' }))
}

export default authRoutes

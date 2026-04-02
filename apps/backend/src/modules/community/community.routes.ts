import { FastifyPluginAsync } from 'fastify'

// Community routes — full implementation in Phase 2
const communityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ping', async () => ({ message: 'Community module ready — Phase 2 coming soon' }))
}

export default communityRoutes

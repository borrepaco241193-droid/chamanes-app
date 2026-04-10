import { FastifyPluginAsync } from 'fastify'
import { AuthService } from './auth.service.js'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  changePasswordSchema,
} from './auth.schema.js'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AuthService(fastify.prisma, fastify.redis)

  fastify.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body)
    const result = await service.login(body, req.ip, req.headers['user-agent'])
    return reply.code(200).send({ data: result })
  })

  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = registerSchema.parse(req.body)
    const result = await service.register(body)
    return reply.code(201).send({ data: result, message: 'Account created. Please verify your email.' })
  })

  fastify.post('/refresh', async (req, reply) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body)
    const result = await service.refresh(refreshToken)
    return reply.code(200).send({ data: result })
  })

  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body)
    await service.logout(refreshToken, req.user.sub)
    return reply.code(200).send({ message: 'Logged out successfully' })
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const user = await service.getMe(req.user.sub)
    return reply.code(200).send({ data: user })
  })

  fastify.post('/forgot-password', { config: { rateLimit: { max: 3, timeWindow: '5 minutes' } } }, async (req, reply) => {
    const body = forgotPasswordSchema.parse(req.body)
    await service.forgotPassword(body)
    return reply.code(200).send({ message: 'If that email exists, a reset link has been sent.' })
  })

  fastify.post('/reset-password', async (req, reply) => {
    const body = resetPasswordSchema.parse(req.body)
    await service.resetPassword(body)
    return reply.code(200).send({ message: 'Password reset successfully. Please log in.' })
  })

  fastify.post('/verify-email', async (req, reply) => {
    const { token } = verifyEmailSchema.parse(req.body)
    await service.verifyEmail(token)
    return reply.code(200).send({ message: 'Email verified successfully.' })
  })

  fastify.post('/change-password', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)
    await service.changePassword(req.user.sub, currentPassword, newPassword)
    return reply.code(200).send({ message: 'Contraseña actualizada correctamente.' })
  })
}

export default authRoutes

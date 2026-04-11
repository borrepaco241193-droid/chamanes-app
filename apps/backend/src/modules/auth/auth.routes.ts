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

  // ── Upload official ID photo for identity verification ────
  fastify.post('/upload-id', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const userId = req.user.sub
    const data = await req.file()
    if (!data) {
      return reply.code(400).send({ error: 'BadRequest', message: 'No se recibió ningún archivo' })
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedMime.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'BadRequest', message: 'Solo se aceptan imágenes (JPG, PNG, WEBP)' })
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) { chunks.push(chunk) }
    const buffer = Buffer.concat(chunks)

    let idPhotoUrl: string
    const { env } = await import('../../config/env.js')

    if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_ACCOUNT_ID) {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
      })
      const ext = data.mimetype.split('/')[1] ?? 'jpg'
      const key = `id-photos/${userId}-${Date.now()}.${ext}`
      await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: data.mimetype }))
      idPhotoUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `https://${env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`
    } else {
      idPhotoUrl = `data:${data.mimetype};base64,${buffer.toString('base64')}`
    }

    await fastify.prisma.user.update({
      where: { id: userId },
      data: { idPhotoUrl, idVerified: false }, // reset to pending review
    })

    return reply.send({ ok: true, idPhotoUrl })
  })
}

export default authRoutes

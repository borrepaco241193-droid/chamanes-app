import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { AuthService } from './auth.service.js'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  changePasswordSchema,
  changeEmailSchema,
} from './auth.schema.js'
import { signAccessToken, signRefreshToken, parseExpiresIn } from '../../lib/tokens.js'
import { env } from '../../config/env.js'

// Validate with Zod and return 400 directly so the global error handler is bypassed
// Uses name/issues checks instead of instanceof to avoid ESM cross-module boundary issues
function validate<T>(schema: { parse: (v: unknown) => T }, data: unknown, reply: any): T | null {
  try {
    return schema.parse(data)
  } catch (err: any) {
    const isZod = err?.name === 'ZodError' || Array.isArray(err?.issues)
    if (isZod) {
      reply.code(400).send({ error: 'Validation Error', message: 'Invalid request data', details: err.issues ?? [] })
      return null
    }
    throw err
  }
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AuthService(fastify.prisma, fastify.redis)

  fastify.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body)
    const result = await service.login(body, req.ip, req.headers['user-agent'])
    return reply.code(200).send({ data: result })
  })

  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = validate(registerSchema, req.body, reply)
    if (!body) return
    const result = await service.register(body)
    return reply.code(201).send({ data: result, message: 'Account created. Please verify your email.' })
  })

  fastify.post('/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (req, reply) => {
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
    const communityUsers = (user as any).communityUsers ?? []
    let communities: any[]
    if (req.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN always gets ALL communities regardless of communityUser rows
      const allCommunities = await fastify.prisma.community.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, logoUrl: true },
      })
      communities = allCommunities.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logoUrl ?? null, role: 'SUPER_ADMIN' }))
    } else if (communityUsers.length > 0) {
      communities = communityUsers.map((cu: any) => ({
        id: cu.communityId,
        name: cu.community.name,
        logoUrl: cu.community.logoUrl ?? null,
        role: cu.role,
      }))
    } else {
      communities = []
    }
    return reply.code(200).send({ data: { ...user, communities } })
  })

  fastify.post('/forgot-password', { config: { rateLimit: { max: 3, timeWindow: '5 minutes' } } }, async (req, reply) => {
    const body = forgotPasswordSchema.parse(req.body)
    await service.forgotPassword(body)
    return reply.code(200).send({ message: 'If that email exists, a reset link has been sent.' })
  })

  fastify.post('/reset-password', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const body = validate(resetPasswordSchema, req.body, reply)
    if (!body) return
    await service.resetPassword(body)
    return reply.code(200).send({ message: 'Password reset successfully. Please log in.' })
  })

  fastify.post('/verify-email', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { token } = verifyEmailSchema.parse(req.body)
    await service.verifyEmail(token)
    return reply.code(200).send({ message: 'Email verified successfully.' })
  })

  fastify.post('/change-password', { preHandler: [fastify.authenticate], config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (req, reply) => {
    const parsed = validate(changePasswordSchema, req.body, reply)
    if (!parsed) return
    await service.changePassword(req.user.sub, parsed.currentPassword, parsed.newPassword)
    return reply.code(200).send({ message: 'Contraseña actualizada correctamente.' })
  })

  fastify.post('/change-email', { preHandler: [fastify.authenticate], config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req, reply) => {
    const parsed = validate(changeEmailSchema, req.body, reply)
    if (!parsed) return
    await service.changeEmail(req.user.sub, parsed.newEmail, parsed.currentPassword)
    return reply.code(200).send({ message: 'Correo actualizado correctamente.' })
  })

  // ── Update own profile (name/phone) ──────────────────────
  fastify.patch('/me', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const body = (req.body ?? {}) as any
    const updates: any = {}
    if (typeof body.firstName === 'string' && body.firstName.trim()) updates.firstName = body.firstName.trim()
    if (typeof body.lastName  === 'string' && body.lastName.trim())  updates.lastName  = body.lastName.trim()
    if (typeof body.phone     === 'string')                          updates.phone     = body.phone.trim() || null
    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ error: 'BadRequest', message: 'No hay campos para actualizar' })
    }
    const updated = await fastify.prisma.user.update({
      where: { id: req.user.sub },
      data: updates,
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, avatarUrl: true },
    })
    return reply.send({ ok: true, user: updated })
  })

  // ── Upload profile avatar ─────────────────────────────────
  fastify.post('/upload-avatar', { preHandler: [fastify.authenticate], config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (req, reply) => {
    const userId = req.user.sub
    const data = await req.file()
    if (!data) {
      return reply.code(400).send({ error: 'BadRequest', message: 'No se recibió ningún archivo' })
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedMime.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'BadRequest', message: 'Solo se aceptan imágenes (JPG, PNG, WEBP)' })
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
    const chunks: Buffer[] = []
    let totalSize = 0
    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > MAX_FILE_SIZE) {
        return reply.code(413).send({ error: 'PayloadTooLarge', message: 'La imagen no puede superar 5 MB' })
      }
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    let avatarUrl: string
    const { env } = await import('../../config/env.js')

    if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_ACCOUNT_ID) {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
      })
      const ext = data.mimetype.split('/')[1] ?? 'jpg'
      const key = `avatars/${userId}-${Date.now()}.${ext}`
      await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: data.mimetype }))
      avatarUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `https://${env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`
    } else {
      avatarUrl = `data:${data.mimetype};base64,${buffer.toString('base64')}`
    }

    await fastify.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    return reply.send({ ok: true, avatarUrl })
  })

  // ── Upload official ID photo for identity verification ────
  fastify.post('/upload-id', { preHandler: [fastify.authenticate], config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req, reply) => {
    const userId = req.user.sub
    const data = await req.file()
    if (!data) {
      return reply.code(400).send({ error: 'BadRequest', message: 'No se recibió ningún archivo' })
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedMime.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'BadRequest', message: 'Solo se aceptan imágenes (JPG, PNG, WEBP)' })
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
    const chunks: Buffer[] = []
    let totalSize = 0
    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > MAX_FILE_SIZE) {
        return reply.code(413).send({ error: 'PayloadTooLarge', message: 'La imagen no puede superar 5 MB' })
      }
      chunks.push(chunk)
    }
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
      data: { idPhotoUrl, idVerified: false, idVerificationStatus: 'PENDING' },
    })

    return reply.send({ ok: true, idPhotoUrl })
  })
  // ── Bootstrap: claim SUPER_ADMIN if none exists ──────────
  // Allows a COMMUNITY_ADMIN/MANAGER to become SUPER_ADMIN when the system
  // has no SUPER_ADMIN yet. Returns fresh tokens so re-login is not needed.
  fastify.post('/claim-super-admin', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const callerId = req.user.sub

    // Always re-read from DB — JWT may carry a stale role
    const callerUser = await fastify.prisma.user.findUnique({
      where: { id: callerId },
      select: { globalRole: true, isActive: true },
    })
    if (!callerUser?.isActive) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Cuenta inactiva' })
    }
    if (callerUser.globalRole === UserRole.SUPER_ADMIN) {
      return reply.code(400).send({ error: 'BadRequest', message: 'Ya eres Super Admin' })
    }

    // Check if caller has any active COMMUNITY_ADMIN or MANAGER membership (DB truth)
    const adminMembership = await fastify.prisma.communityUser.findFirst({
      where: {
        userId: callerId,
        isActive: true,
        role: { in: [UserRole.COMMUNITY_ADMIN, UserRole.MANAGER] },
      },
      select: { id: true },
    })
    if (!adminMembership) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Solo administradores de comunidad pueden reclamar este acceso' })
    }

    // Check if any SUPER_ADMIN exists in the system
    const existingSuperAdmin = await fastify.prisma.user.findFirst({
      where: { globalRole: UserRole.SUPER_ADMIN, isActive: true },
      select: { id: true },
    })

    if (existingSuperAdmin) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Ya existe un Super Admin en el sistema. Pídele que te otorgue acceso.',
      })
    }

    // No SUPER_ADMIN exists — promote this user
    await fastify.prisma.user.update({
      where: { id: callerId },
      data: { globalRole: UserRole.SUPER_ADMIN },
    })

    // Fetch all communities for the new super admin
    const allCommunities = await fastify.prisma.community.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, logoUrl: true },
    })

    // Issue fresh tokens with SUPER_ADMIN role
    const firstCommunityId = allCommunities[0]?.id
    const accessToken = signAccessToken({
      sub: callerId,
      email: req.user.email,
      role: UserRole.SUPER_ADMIN,
      communityId: firstCommunityId,
      communityRole: undefined,
    })

    const refreshTokenValue = signRefreshToken()
    const refreshExpiry = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)
    await fastify.prisma.refreshToken.create({
      data: {
        userId: callerId,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + refreshExpiry * 1000),
      },
    })

    const caller = await fastify.prisma.user.findUnique({
      where: { id: callerId },
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, idVerified: true, idPhotoUrl: true },
    })

    return reply.send({
      ok: true,
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: parseExpiresIn(env.JWT_EXPIRES_IN),
      user: {
        id: caller!.id,
        email: caller!.email,
        firstName: caller!.firstName,
        lastName: caller!.lastName,
        avatarUrl: caller!.avatarUrl,
        role: 'SUPER_ADMIN',
        communityId: firstCommunityId,
        communityRole: undefined,
        idVerified: caller!.idVerified,
        idPhotoUploaded: !!caller!.idPhotoUrl,
        communities: allCommunities.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logoUrl ?? null, role: 'SUPER_ADMIN' })),
      },
    })
  })

  // ── One-time bootstrap: create super@chamanes.app SUPER_ADMIN ──
  // Protected by secret token in URL. Remove this route after first use.
  fastify.post('/bootstrap-super-admin', async (req, reply) => {
    const body = (req.body ?? {}) as any
    if (body.secret !== 'chamanes-bootstrap-2024') {
      return reply.code(403).send({ error: 'Forbidden' })
    }

    const email = 'super@chamanes.app'
    const password = 'SuperAdmin2024!'

    // Check if already exists
    const existing = await fastify.prisma.user.findUnique({ where: { email } })
    if (existing) {
      // Just promote to SUPER_ADMIN if exists
      await fastify.prisma.user.update({
        where: { id: existing.id },
        data: { globalRole: UserRole.SUPER_ADMIN, isActive: true },
      })
      return reply.send({ ok: true, action: 'promoted', email, password: '(same as before)' })
    }

    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 12)

    await fastify.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        globalRole: UserRole.SUPER_ADMIN,
        isActive: true,
        isVerified: true,
      },
    })

    return reply.code(201).send({ ok: true, action: 'created', email, password })
  })
}

export default authRoutes

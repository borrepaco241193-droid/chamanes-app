import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { PrismaClient, UserRole } from '@prisma/client'
import type { Redis } from 'ioredis'
import { signAccessToken, signRefreshToken, parseExpiresIn } from '../../lib/tokens.js'
import { sendEmail, passwordResetEmail, verifyEmailTemplate } from '../../lib/email.js'
import { env } from '../../config/env.js'
import type { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from './auth.schema.js'

// ============================================================
// Auth Service — all authentication business logic
// Kept separate from routes for testability
// ============================================================

const BCRYPT_ROUNDS = 12
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 // 15 minutes in seconds

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
  ) {}

  // ── Login ─────────────────────────────────────────────────
  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const lockKey = `auth:lockout:${input.email}`
    const attemptsKey = `auth:attempts:${input.email}`

    // Check if account is locked
    const isLocked = await this.redis.get(lockKey)
    if (isLocked) {
      const ttl = await this.redis.ttl(lockKey)
      throw Object.assign(new Error('Account temporarily locked'), {
        statusCode: 429,
        remainingSeconds: ttl,
      })
    }

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: {
        communityUsers: {
          where: { isActive: true },
          include: { community: { select: { id: true, name: true, logoUrl: true } } },
        },
      },
    })

    // Constant-time comparison to prevent timing attacks
    const passwordMatch = user
      ? await bcrypt.compare(input.password, user.passwordHash)
      : await bcrypt.compare(input.password, '$2b$12$invalidhashfortimingnormalization')

    if (!user || !passwordMatch) {
      // Track failed attempts
      const attempts = await this.redis.incr(attemptsKey)
      await this.redis.expire(attemptsKey, LOCKOUT_DURATION)

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await this.redis.setex(lockKey, LOCKOUT_DURATION, '1')
        await this.redis.del(attemptsKey)
      }

      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 })
    }

    if (!user.isActive) {
      throw Object.assign(new Error('Your account has been deactivated. Contact your administrator.'), { statusCode: 403 })
    }

    // Clear failed attempts on success
    await this.redis.del(attemptsKey)
    await this.redis.del(lockKey)

    // Determine active community context
    const activeCommunity = user.communityUsers[0]

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.globalRole,
      communityId: activeCommunity?.communityId,
      communityRole: activeCommunity?.role,
    })

    const refreshTokenValue = signRefreshToken()
    const refreshExpiry = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + refreshExpiry * 1000),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      },
    })

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        communityId: activeCommunity?.communityId,
        action: 'user.login',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    })

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: parseExpiresIn(env.JWT_EXPIRES_IN),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.globalRole,
        communityId: activeCommunity?.communityId,
        communityRole: activeCommunity?.role,
        communities: user.communityUsers.map((cu) => ({
          id: cu.communityId,
          name: cu.community.name,
          logoUrl: cu.community.logoUrl,
          role: cu.role,
        })),
      },
    }
  }

  // ── Refresh Token ─────────────────────────────────────────
  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            communityUsers: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
      },
    })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 })
    }

    if (!stored.user.isActive) {
      throw Object.assign(new Error('Account deactivated'), { statusCode: 403 })
    }

    // Rotate: revoke old token, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const activeCommunity = stored.user.communityUsers[0]

    const newAccessToken = signAccessToken({
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.globalRole,
      communityId: activeCommunity?.communityId,
      communityRole: activeCommunity?.role,
    })

    const newRefreshToken = signRefreshToken()
    const refreshExpiry = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)

    await this.prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + refreshExpiry * 1000),
        userAgent: stored.userAgent,
        ipAddress: stored.ipAddress,
      },
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: parseExpiresIn(env.JWT_EXPIRES_IN),
    }
  }

  // ── Logout ────────────────────────────────────────────────
  async logout(refreshToken: string, userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, userId },
      data: { revokedAt: new Date() },
    })

    await this.prisma.auditLog.create({
      data: { userId, action: 'user.logout' },
    })
  }

  // ── Get current user ──────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        communityUsers: {
          where: { isActive: true },
          include: {
            community: { select: { id: true, name: true, logoUrl: true, currency: true } },
            units: {
              include: { unit: { select: { id: true, number: true, floor: true, block: true } } },
            },
          },
        },
      },
    })

    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    const { passwordHash, verifyToken, resetToken, resetTokenExpiresAt, ...safeUser } = user
    return safeUser
  }

  // ── Forgot Password ───────────────────────────────────────
  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } })

    // Always return success — never reveal if email exists (security)
    if (!user) return

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiresAt: expires },
    })

    const resetUrl = `${env.API_URL}/reset-password?token=${token}`

    await sendEmail({
      to: user.email,
      subject: 'Restablecer contraseña — Chamanes',
      html: passwordResetEmail(user.firstName, resetUrl),
    })
  }

  // ── Reset Password ────────────────────────────────────────
  async resetPassword(input: ResetPasswordInput) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: input.token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    })

    if (!user) {
      throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 })
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    })

    // Revoke all refresh tokens — force re-login everywhere
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  // ── Verify Email ──────────────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { verifyToken: token },
    })

    if (!user) {
      throw Object.assign(new Error('Invalid verification token'), { statusCode: 400 })
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verifyToken: null },
    })
  }

  // ── Register (used by admin to add residents) ─────────────
  async register(input: RegisterInput) {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email } })
    if (exists) {
      throw Object.assign(new Error('An account with this email already exists'), { statusCode: 409 })
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    const verifyToken = randomBytes(32).toString('hex')

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        passwordHash,
        verifyToken,
        globalRole: UserRole.RESIDENT,
      },
    })

    const verifyUrl = `${env.API_URL}/verify-email?token=${verifyToken}`
    await sendEmail({
      to: user.email,
      subject: 'Verifica tu correo — Chamanes',
      html: verifyEmailTemplate(user.firstName, verifyUrl),
    })

    return { id: user.id, email: user.email, firstName: user.firstName }
  }
}

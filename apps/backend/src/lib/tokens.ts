import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { env } from '../config/env.js'
import type { JWTPayload } from '../plugins/auth.js'

// ============================================================
// Token utilities — JWT access tokens + opaque refresh tokens
// Access token: short-lived JWT (15m), carries user identity
// Refresh token: long-lived random string stored in DB (30d)
// ============================================================

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'chamanes-api',
    audience: 'chamanes-app',
  })
}

export function signRefreshToken(): string {
  // Opaque random token — not a JWT, stored in DB so it can be revoked
  return randomBytes(64).toString('hex')
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'chamanes-api',
    audience: 'chamanes-app',
  }) as JWTPayload
}

export function parseExpiresIn(str: string): number {
  const unit = str.slice(-1)
  const value = parseInt(str.slice(0, -1))
  const map: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  }
  return value * (map[unit] ?? 60)
}

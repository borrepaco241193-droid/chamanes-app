/**
 * Emergency admin reset script
 * Restores email to admin@chamanes.app and resets password to Admin1234!
 *
 * Run with production DATABASE_URL:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/reset-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TARGET_EMAIL    = 'admin@chamanes.app'
const NEW_PASSWORD    = 'Admin1234!'
const POSSIBLE_EMAILS = [
  'test@chamanes.app',
  'test@chamanes app',
  'admin@chamanes.app',
]

async function main() {
  // Find admin by any known email OR by SUPER_ADMIN role
  let user = null

  for (const email of POSSIBLE_EMAILS) {
    user = await prisma.user.findUnique({ where: { email } })
    if (user) { console.log(`Found user with email: ${email}`); break }
  }

  if (!user) {
    // Last resort: find by SUPER_ADMIN role
    user = await prisma.user.findFirst({
      where: { globalRole: 'SUPER_ADMIN' },
    })
    if (user) console.log(`Found SUPER_ADMIN: ${user.email}`)
  }

  if (!user) {
    console.log('❌  No admin user found. Creating one...')
    const hash = await bcrypt.hash(NEW_PASSWORD, 12)
    user = await prisma.user.create({
      data: {
        email:        TARGET_EMAIL,
        firstName:    'Super',
        lastName:     'Admin',
        passwordHash: hash,
        globalRole:   'SUPER_ADMIN',
        isVerified:   true,
        isActive:     true,
      },
    })
    console.log(`✅  Created new admin: ${user.email}`)
    return
  }

  // Reset email + password + make sure account is active
  const hash = await bcrypt.hash(NEW_PASSWORD, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email:        TARGET_EMAIL,
      passwordHash: hash,
      isActive:     true,
      isVerified:   true,
    },
  })

  // Revoke all old refresh tokens so old sessions are cleared
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data:  { revokedAt: new Date() },
  })

  console.log(`✅  Admin restored!`)
  console.log(`    Email:    ${TARGET_EMAIL}`)
  console.log(`    Password: ${NEW_PASSWORD}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

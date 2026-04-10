/**
 * One-time script: restore admin email
 * Run from apps/backend/:  npx ts-node --esm scripts/fix-admin-email.ts
 * Or on Railway console:   node -e "require('./dist/scripts/fix-admin-email.js')"
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const FROM = 'test@chamanes.app'  // current wrong email
  const TO   = 'admin@chamanes.app' // correct email

  const user = await prisma.user.findUnique({ where: { email: FROM } })
  if (!user) {
    console.log(`❌  No user found with email "${FROM}"`)
    return
  }

  // Make sure target email is free
  const conflict = await prisma.user.findUnique({ where: { email: TO } })
  if (conflict) {
    console.log(`⚠️  Email "${TO}" is already in use by user ${conflict.id}`)
    return
  }

  await prisma.user.update({ where: { id: user.id }, data: { email: TO } })
  console.log(`✅  Updated user ${user.id}: ${FROM} → ${TO}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

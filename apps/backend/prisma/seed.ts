import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

// ============================================================
// Seed file — creates demo data for local development
// Run: npm run db:seed
// ============================================================

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Chamanes database...')

  // ── Super Admin ──────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@chamanes.app' },
    update: {},
    create: {
      email: 'admin@chamanes.app',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: await bcrypt.hash('Admin1234!', 12),
      globalRole: UserRole.SUPER_ADMIN,
      isVerified: true,
    },
  })
  console.log(`✅ Super Admin: ${superAdmin.email}`)

  // ── Demo Community ───────────────────────────────────────
  const community = await prisma.community.upsert({
    where: { id: 'demo-community-001' },
    update: {},
    create: {
      id: 'demo-community-001',
      name: 'Residencial Chamanes',
      address: 'Av. Principal 100',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'MX',
      zipCode: '06600',
      phone: '+52 55 1234 5678',
      email: 'admin@residencialchamanes.mx',
      totalUnits: 20,
      timezone: 'America/Mexico_City',
      currency: 'MXN',
      settings: {
        maintenanceFeeAmount: 1500,
        paymentDueDayOfMonth: 5,
        lateFeePct: 10,
        gracePeriodDays: 5,
        requireVisitorPhoto: false,
        maxVisitorPassDays: 7,
      },
    },
  })
  console.log(`✅ Community: ${community.name}`)

  // ── Community Admin ──────────────────────────────────────
  const communityAdmin = await prisma.user.upsert({
    where: { email: 'manager@chamanes.app' },
    update: {},
    create: {
      email: 'manager@chamanes.app',
      firstName: 'Ana',
      lastName: 'García',
      passwordHash: await bcrypt.hash('Manager1234!', 12),
      globalRole: UserRole.COMMUNITY_ADMIN,
      isVerified: true,
    },
  })

  await prisma.communityUser.upsert({
    where: { userId_communityId: { userId: communityAdmin.id, communityId: community.id } },
    update: {},
    create: {
      userId: communityAdmin.id,
      communityId: community.id,
      role: UserRole.COMMUNITY_ADMIN,
    },
  })
  console.log(`✅ Community Admin: ${communityAdmin.email}`)

  // ── Demo Resident ────────────────────────────────────────
  const resident = await prisma.user.upsert({
    where: { email: 'resident@chamanes.app' },
    update: {},
    create: {
      email: 'resident@chamanes.app',
      firstName: 'Carlos',
      lastName: 'López',
      passwordHash: await bcrypt.hash('Resident1234!', 12),
      globalRole: UserRole.RESIDENT,
      isVerified: true,
    },
  })

  const communityResident = await prisma.communityUser.upsert({
    where: { userId_communityId: { userId: resident.id, communityId: community.id } },
    update: {},
    create: {
      userId: resident.id,
      communityId: community.id,
      role: UserRole.RESIDENT,
    },
  })

  // ── Demo Unit ────────────────────────────────────────────
  const unit = await prisma.unit.upsert({
    where: { communityId_number: { communityId: community.id, number: '101' } },
    update: {},
    create: {
      communityId: community.id,
      number: '101',
      floor: 1,
      block: 'A',
      type: 'apartment',
      isOccupied: true,
    },
  })

  await prisma.unitResident.upsert({
    where: { unitId_communityUserId: { unitId: unit.id, communityUserId: communityResident.id } },
    update: {},
    create: {
      unitId: unit.id,
      communityUserId: communityResident.id,
      isPrimary: true,
    },
  })
  console.log(`✅ Resident: ${resident.email} → Unit ${unit.number}`)

  // ── Demo Guard ───────────────────────────────────────────
  const guard = await prisma.user.upsert({
    where: { email: 'guard@chamanes.app' },
    update: {},
    create: {
      email: 'guard@chamanes.app',
      firstName: 'Pedro',
      lastName: 'Martínez',
      passwordHash: await bcrypt.hash('Guard1234!', 12),
      globalRole: UserRole.GUARD,
      isVerified: true,
    },
  })

  await prisma.communityUser.upsert({
    where: { userId_communityId: { userId: guard.id, communityId: community.id } },
    update: {},
    create: {
      userId: guard.id,
      communityId: community.id,
      role: UserRole.GUARD,
    },
  })
  console.log(`✅ Guard: ${guard.email}`)

  // ── Demo Common Areas ─────────────────────────────────────
  const commonAreas = [
    { name: 'Alberca', description: 'Piscina con área de descanso', capacity: 30, openTime: '08:00', closeTime: '20:00' },
    { name: 'Salón de Fiestas', description: 'Salón para eventos privados', capacity: 80, openTime: '10:00', closeTime: '23:00', requiresApproval: true },
    { name: 'Gimnasio', description: 'Equipo de ejercicio completo', capacity: 15, openTime: '06:00', closeTime: '22:00' },
    { name: 'Área BBQ', description: 'Parrillas y mesas al aire libre', capacity: 20, openTime: '12:00', closeTime: '21:00' },
  ]

  for (const area of commonAreas) {
    await prisma.commonArea.upsert({
      where: { id: `area-${area.name.toLowerCase().replace(/\s/g, '-')}-${community.id}` },
      update: {},
      create: {
        id: `area-${area.name.toLowerCase().replace(/\s/g, '-')}-${community.id}`,
        communityId: community.id,
        ...area,
      },
    })
  }
  console.log(`✅ Common areas seeded`)

  console.log('\n🎉 Seed complete!\n')
  console.log('Test accounts:')
  console.log('  Super Admin:  admin@chamanes.app     / Admin1234!')
  console.log('  Com. Admin:   manager@chamanes.app   / Manager1234!')
  console.log('  Resident:     resident@chamanes.app  / Resident1234!')
  console.log('  Guard:        guard@chamanes.app     / Guard1234!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

import {
  PrismaClient,
  UserRole,
  PaymentStatus,
  PaymentType,
  AccessMethod,
  VisitorPassStatus,
  ReservationStatus,
  WorkOrderStatus,
  WorkOrderPriority,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

// ============================================================
// Seed file — creates demo data for local development
// Run: npm run db:seed
// ============================================================

const prisma = new PrismaClient()

const COMMUNITY_ID = 'demo-community-001'

// ── Helpers ──────────────────────────────────────────────────
function getMonthName(month: number): string {
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
                 'Septiembre','Octubre','Noviembre','Diciembre']
  return names[month - 1] ?? String(month)
}
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d }
function hoursAgo(n: number) { const d = new Date(); d.setHours(d.getHours() - n); return d }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d }

// ── Resident names pool ───────────────────────────────────────
const RESIDENTS = [
  { first: 'Carlos',    last: 'López',      email: 'resident@chamanes.app' },
  { first: 'María',     last: 'Hernández',  email: 'maria.h@chamanes.app' },
  { first: 'José',      last: 'Martínez',   email: 'jose.m@chamanes.app' },
  { first: 'Laura',     last: 'García',     email: 'laura.g@chamanes.app' },
  { first: 'Roberto',   last: 'Díaz',       email: 'roberto.d@chamanes.app' },
  { first: 'Patricia',  last: 'Rodríguez',  email: 'patricia.r@chamanes.app' },
  { first: 'Miguel',    last: 'Sánchez',    email: 'miguel.s@chamanes.app' },
  { first: 'Ana',       last: 'Flores',     email: 'ana.f@chamanes.app' },
  { first: 'Fernando',  last: 'Torres',     email: 'fernando.t@chamanes.app' },
  { first: 'Claudia',   last: 'Ramírez',    email: 'claudia.r@chamanes.app' },
  { first: 'Alejandro', last: 'Morales',    email: 'alejandro.m@chamanes.app' },
  { first: 'Gabriela',  last: 'Cruz',       email: 'gabriela.c@chamanes.app' },
  { first: 'Eduardo',   last: 'Reyes',      email: 'eduardo.re@chamanes.app' },
  { first: 'Verónica',  last: 'Gómez',      email: 'veronica.g@chamanes.app' },
  { first: 'Daniel',    last: 'Jiménez',    email: 'daniel.j@chamanes.app' },
  { first: 'Mariana',   last: 'Vargas',     email: 'mariana.v@chamanes.app' },
  { first: 'Sergio',    last: 'Castillo',   email: 'sergio.c@chamanes.app' },
  { first: 'Isabel',    last: 'Mendoza',    email: 'isabel.m@chamanes.app' },
  { first: 'Arturo',    last: 'Guerrero',   email: 'arturo.g@chamanes.app' },
  { first: 'Sofía',     last: 'Navarro',    email: 'sofia.n@chamanes.app' },
]

// ── Units layout ─────────────────────────────────────────────
const UNITS: { number: string; floor: number; block: string; type: string }[] = []
for (const block of ['A', 'B', 'C']) {
  for (let floor = 1; floor <= 3; floor++) {
    for (let unit = 1; unit <= 3; unit++) {
      UNITS.push({
        number: `${block}${floor}0${unit}`,
        floor,
        block,
        type: unit === 3 ? 'penthouse' : 'apartment',
      })
    }
  }
}
// 27 units → trim to 25
const UNITS_25 = UNITS.slice(0, 25)

async function main() {
  console.log('🌱 Seeding Chamanes database...')

  const pwHash = await bcrypt.hash('Admin1234!', 12)
  const resHash = await bcrypt.hash('Resident1234!', 12)

  // ── Super Admin ──────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@chamanes.app' },
    update: {},
    create: {
      email: 'admin@chamanes.app',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: pwHash,
      globalRole: UserRole.SUPER_ADMIN,
      isVerified: true,
      idVerified: true,
    },
  })

  // ── Demo Community ───────────────────────────────────────
  const community = await prisma.community.upsert({
    where: { id: COMMUNITY_ID },
    update: { totalUnits: 25 },
    create: {
      id: COMMUNITY_ID,
      name: 'Residencial Chamanes',
      address: 'Av. Principal 100',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'MX',
      zipCode: '06600',
      phone: '+52 55 1234 5678',
      email: 'admin@residencialchamanes.mx',
      totalUnits: 25,
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
  console.log(`✅ Community: ${community.name} (${COMMUNITY_ID})`)

  // ── Community Admin ──────────────────────────────────────
  const communityAdmin = await prisma.user.upsert({
    where: { email: 'manager@chamanes.app' },
    update: {},
    create: {
      email: 'manager@chamanes.app',
      firstName: 'Ana',
      lastName: 'García',
      passwordHash: pwHash,
      globalRole: UserRole.COMMUNITY_ADMIN,
      isVerified: true,
      idVerified: true,
    },
  })
  await prisma.communityUser.upsert({
    where: { userId_communityId: { userId: communityAdmin.id, communityId: COMMUNITY_ID } },
    update: {},
    create: { userId: communityAdmin.id, communityId: COMMUNITY_ID, role: UserRole.COMMUNITY_ADMIN },
  })

  // ── Manager ──────────────────────────────────────────────
  const mgr = await prisma.user.upsert({
    where: { email: 'mgrtest@chamanes.app' },
    update: {},
    create: {
      email: 'mgrtest@chamanes.app',
      firstName: 'Luis',
      lastName: 'Peña',
      passwordHash: pwHash,
      globalRole: UserRole.MANAGER,
      isVerified: true,
      idVerified: true,
    },
  })
  await prisma.communityUser.upsert({
    where: { userId_communityId: { userId: mgr.id, communityId: COMMUNITY_ID } },
    update: {},
    create: { userId: mgr.id, communityId: COMMUNITY_ID, role: UserRole.MANAGER },
  })
  console.log(`✅ Manager: ${mgr.email} / Admin1234!`)

  // ── Guard ────────────────────────────────────────────────
  const guard = await prisma.user.upsert({
    where: { email: 'guard@chamanes.app' },
    update: {},
    create: {
      email: 'guard@chamanes.app',
      firstName: 'Pedro',
      lastName: 'Martínez',
      passwordHash: pwHash,
      globalRole: UserRole.GUARD,
      isVerified: true,
      idVerified: true,
    },
  })
  await prisma.communityUser.upsert({
    where: { userId_communityId: { userId: guard.id, communityId: COMMUNITY_ID } },
    update: {},
    create: { userId: guard.id, communityId: COMMUNITY_ID, role: UserRole.GUARD },
  })

  // ── 25 Units ─────────────────────────────────────────────
  console.log('🏢 Creating 25 units...')
  const createdUnits: { id: string; number: string }[] = []
  for (const u of UNITS_25) {
    const unit = await prisma.unit.upsert({
      where: { communityId_number: { communityId: COMMUNITY_ID, number: u.number } },
      update: { isOccupied: true },
      create: { communityId: COMMUNITY_ID, ...u, isOccupied: false },
    })
    createdUnits.push({ id: unit.id, number: unit.number })
  }
  console.log(`✅ ${createdUnits.length} units created`)

  // ── 20 Residents + assign to units ───────────────────────
  console.log('👥 Creating 20 residents...')
  const createdResidents: { id: string; communityUserId: string; unitId: string; name: string }[] = []

  for (let i = 0; i < 20; i++) {
    const r = RESIDENTS[i]
    const unit = createdUnits[i]

    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        email: r.email,
        firstName: r.first,
        lastName: r.last,
        passwordHash: resHash,
        globalRole: UserRole.RESIDENT,
        isVerified: true,
        idVerified: true,
        phone: `+52 55 ${1000 + i * 47} ${2000 + i * 33}`,
      },
    })

    const cu = await prisma.communityUser.upsert({
      where: { userId_communityId: { userId: user.id, communityId: COMMUNITY_ID } },
      update: {},
      create: { userId: user.id, communityId: COMMUNITY_ID, role: UserRole.RESIDENT },
    })

    await prisma.unit.update({ where: { id: unit.id }, data: { isOccupied: true } })

    await prisma.unitResident.upsert({
      where: { unitId_communityUserId: { unitId: unit.id, communityUserId: cu.id } },
      update: {},
      create: { unitId: unit.id, communityUserId: cu.id, isPrimary: true },
    })

    createdResidents.push({ id: user.id, communityUserId: cu.id, unitId: unit.id, name: `${r.first} ${r.last}` })
  }
  console.log(`✅ 20 residents assigned to units`)

  // ── Payments: 10 with PENDING, 10 paid (current month) ───
  console.log('💰 Creating payments...')
  const now = new Date()
  const curMonth = now.getMonth() + 1
  const curYear  = now.getFullYear()
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1
  const prevYear  = curMonth === 1 ? curYear - 1 : curYear

  for (let i = 0; i < 20; i++) {
    const res = createdResidents[i]
    const hasPending = i < 10 // first 10 have pending payment

    // Current month payment
    const existing = await prisma.payment.findFirst({
      where: { communityId: COMMUNITY_ID, unitId: res.unitId, periodMonth: curMonth, periodYear: curYear, type: PaymentType.MAINTENANCE_FEE },
    })
    if (!existing) {
      await prisma.payment.create({
        data: {
          communityId: COMMUNITY_ID,
          userId:      res.id,
          unitId:      res.unitId,
          amount:      1500,
          currency:    'MXN',
          type:        PaymentType.MAINTENANCE_FEE,
          description: `Cuota de mantenimiento ${getMonthName(curMonth)} ${curYear}`,
          status:      hasPending ? PaymentStatus.PENDING : PaymentStatus.COMPLETED,
          dueDate:     new Date(curYear, curMonth - 1, 5),
          periodMonth: curMonth,
          periodYear:  curYear,
          paidAt:      hasPending ? null : daysAgo(Math.floor(Math.random() * 4) + 1),
        },
      })
    }

    // Previous month — all paid (historical data for reports)
    const existingPrev = await prisma.payment.findFirst({
      where: { communityId: COMMUNITY_ID, unitId: res.unitId, periodMonth: prevMonth, periodYear: prevYear, type: PaymentType.MAINTENANCE_FEE },
    })
    if (!existingPrev) {
      await prisma.payment.create({
        data: {
          communityId: COMMUNITY_ID,
          userId:      res.id,
          unitId:      res.unitId,
          amount:      1500,
          currency:    'MXN',
          type:        PaymentType.MAINTENANCE_FEE,
          description: `Cuota de mantenimiento ${getMonthName(prevMonth)} ${prevYear}`,
          status:      PaymentStatus.COMPLETED,
          dueDate:     new Date(prevYear, prevMonth - 1, 5),
          periodMonth: prevMonth,
          periodYear:  prevYear,
          paidAt:      daysAgo(20 + Math.floor(Math.random() * 10)),
        },
      })
    }
  }
  console.log(`✅ Payments: 10 PENDING + 10 COMPLETED this month + 20 historical`)

  // ── Common Areas ─────────────────────────────────────────
  const areaData = [
    { id: `area-alberca-${COMMUNITY_ID}`,           name: 'Alberca',          capacity: 30, openTime: '08:00', closeTime: '20:00', requiresApproval: false },
    { id: `area-salon-fiestas-${COMMUNITY_ID}`,     name: 'Salón de Fiestas', capacity: 80, openTime: '10:00', closeTime: '23:00', requiresApproval: true  },
    { id: `area-gimnasio-${COMMUNITY_ID}`,          name: 'Gimnasio',         capacity: 15, openTime: '06:00', closeTime: '22:00', requiresApproval: false },
    { id: `area-area-bbq-${COMMUNITY_ID}`,          name: 'Área BBQ',         capacity: 20, openTime: '12:00', closeTime: '21:00', requiresApproval: false },
  ]
  for (const a of areaData) {
    await prisma.commonArea.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, communityId: COMMUNITY_ID },
    })
  }

  // ── Reservations (last 30 days) ───────────────────────────
  console.log('📅 Creating reservations...')
  const reservationStatuses = [ReservationStatus.CONFIRMED, ReservationStatus.CONFIRMED,
                               ReservationStatus.CANCELLED, ReservationStatus.PENDING]
  for (let i = 0; i < 12; i++) {
    const res    = createdResidents[i % createdResidents.length]
    const area   = areaData[i % areaData.length]
    const start  = daysAgo(28 - i * 2)
    const end    = new Date(start); end.setHours(end.getHours() + 2)
    const status = reservationStatuses[i % reservationStatuses.length]
    await prisma.reservation.create({
      data: {
        communityId:  COMMUNITY_ID,
        userId:       res.id,
        commonAreaId: area.id,
        startTime:    start,
        endTime:      end,
        status,
        feeAmount:    area.requiresApproval ? 300 : 0,
        notes:        i % 3 === 0 ? 'Evento familiar' : null,
      },
    })
  }
  console.log(`✅ 12 reservations created`)

  // ── Visitor Passes + Access Events ───────────────────────
  console.log('🚪 Creating visitor passes and access events...')
  const visitorNames   = ['Juan Pérez','Delivery OXXO','Uber Eats Repartidor','María Visitante',
                          'Técnico Telmex','Limpieza Externa','Familia Rodríguez','Amazon Paquetería']
  const visitorPlates  = ['ABC-123','XYZ-789',null,'DEF-456',null,null,'GHI-012','JKL-345']

  for (let i = 0; i < 8; i++) {
    const host  = createdResidents[i]
    const vFrom = daysAgo(14 - i)
    const vUntil = daysFromNow(1)

    const pass = await prisma.visitorPass.create({
      data: {
        communityId:  COMMUNITY_ID,
        createdById:  host.id,
        visitorName:  visitorNames[i],
        visitorPhone: `+52 55 ${5000 + i * 13} ${6000 + i * 17}`,
        plateNumber:  visitorPlates[i],
        validFrom:    vFrom,
        validUntil:   vUntil,
        maxUses:      i < 4 ? 1 : 5,
        usedCount:    i < 6 ? 1 : 0,
        status:       i < 6 ? VisitorPassStatus.USED : VisitorPassStatus.ACTIVE,
        qrCode:       `SEED-PASS-${COMMUNITY_ID}-${i}-${Date.now()}`,
      },
    })

    // Access event for each used pass
    if (i < 6) {
      await prisma.accessEvent.create({
        data: {
          communityId:    COMMUNITY_ID,
          type:           'ENTRY',
          method:         AccessMethod.QR_CODE,
          personName:     visitorNames[i],
          personType:     'VISITOR',
          plateNumber:    visitorPlates[i],
          visitorPassId:  pass.id,
          isAllowed:      true,
          createdAt:      hoursAgo(24 * i + 2),
        },
      })
    }
  }

  // ── Access Events from residents (APP method) ─────────────
  for (let i = 0; i < 15; i++) {
    const res = createdResidents[i % createdResidents.length]
    const isEntry = i % 3 !== 0
    await prisma.accessEvent.create({
      data: {
        communityId: COMMUNITY_ID,
        type:        isEntry ? 'ENTRY' : 'EXIT',
        method:      AccessMethod.APP,
        personName:  res.name,
        personType:  'RESIDENT',
        isAllowed:   true,
        createdAt:   hoursAgo(i * 3 + 1),
      },
    })
  }

  // One denied event
  await prisma.accessEvent.create({
    data: {
      communityId:  COMMUNITY_ID,
      type:         'ENTRY',
      method:       AccessMethod.QR_CODE,
      personName:   'Desconocido',
      personType:   'VISITOR',
      isAllowed:    false,
      deniedReason: 'Pase vencido',
      createdAt:    hoursAgo(5),
    },
  })
  console.log(`✅ 8 visitor passes + 22 access events created`)

  // ── More Reservations (pending approval) ─────────────────
  console.log('📋 Creating pending reservations for approval...')
  const pendingRes = [
    { res: 0, area: 1, daysFromNowVal: 5,  notes: 'Cumpleaños de mi hijo, aprox 40 personas' },
    { res: 2, area: 1, daysFromNowVal: 8,  notes: 'Reunión de trabajo, 15 personas' },
    { res: 4, area: 1, daysFromNowVal: 12, notes: 'Evento de XV años, 80 personas' },
    { res: 6, area: 3, daysFromNowVal: 3,  notes: null },
    { res: 8, area: 3, daysFromNowVal: 7,  notes: 'Asado familiar' },
  ]
  for (const pr of pendingRes) {
    const start = daysFromNow(pr.daysFromNowVal)
    start.setHours(14, 0, 0, 0)
    const end = new Date(start); end.setHours(18, 0, 0, 0)
    await prisma.reservation.create({
      data: {
        communityId:  COMMUNITY_ID,
        userId:       createdResidents[pr.res].id,
        commonAreaId: areaData[pr.area].id,
        startTime:    start,
        endTime:      end,
        status:       ReservationStatus.PENDING,
        feeAmount:    pr.area === 1 ? 300 : 0,
        notes:        pr.notes,
      },
    })
  }
  console.log(`✅ 5 pending reservations created for admin approval`)

  // ── Work Orders ───────────────────────────────────────────
  console.log('🔧 Creating work orders...')
  const workOrders = [
    { title: 'Fuga de agua en baño', description: 'Se reporta fuga en la llave del baño de la unidad A101. Requiere plomero urgente.', category: 'maintenance', priority: WorkOrderPriority.URGENT, unitIdx: 0, location: 'Unidad A101 – Baño principal' },
    { title: 'Luz fundida en pasillo B2', description: 'El pasillo del segundo piso del bloque B no tiene iluminación desde hace 3 días.', category: 'maintenance', priority: WorkOrderPriority.MEDIUM, unitIdx: null, location: 'Pasillo Bloque B – Piso 2' },
    { title: 'Limpieza área de alberca', description: 'Se requiere limpieza profunda de la alberca y área circundante. Hojas acumuladas.', category: 'cleaning', priority: WorkOrderPriority.LOW, unitIdx: null, location: 'Área alberca' },
    { title: 'Puerta de acceso no cierra', description: 'La puerta de acceso principal no cierra correctamente. Problema con el mecanismo.', category: 'security', priority: WorkOrderPriority.HIGH, unitIdx: null, location: 'Entrada principal' },
    { title: 'Pintura desprendida en fachada', description: 'En el bloque C se observa pintura desprendida en la fachada exterior.', category: 'maintenance', priority: WorkOrderPriority.LOW, unitIdx: null, location: 'Fachada Bloque C' },
    { title: 'Jardín requiere poda', description: 'El jardín central presenta crecimiento excesivo, se solicita poda general.', category: 'cleaning', priority: WorkOrderPriority.MEDIUM, unitIdx: null, location: 'Jardín central' },
  ]

  const woStatuses = [WorkOrderStatus.OPEN, WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.OPEN, WorkOrderStatus.OPEN]

  for (let i = 0; i < workOrders.length; i++) {
    const wo = workOrders[i]
    const reporter = createdResidents[i % createdResidents.length]
    await prisma.workOrder.create({
      data: {
        communityId:  COMMUNITY_ID,
        title:        wo.title,
        description:  wo.description,
        category:     wo.category,
        priority:     wo.priority,
        status:       woStatuses[i],
        unitId:       wo.unitIdx !== null ? createdUnits[wo.unitIdx].id : null,
        location:     wo.location,
        reportedById: reporter.id,
        dueDate:      i < 2 ? daysFromNow(3) : null,
      },
    })
  }
  console.log(`✅ 6 work orders created (2 OPEN urgent, 2 OPEN medium/low, 1 ASSIGNED, 1 IN_PROGRESS)`)

  // ── Summary ───────────────────────────────────────────────
  console.log('\n🎉 Seed complete!\n')
  console.log('═══════════════════════════════════════════')
  console.log('  Super Admin:   admin@chamanes.app     / Admin1234!')
  console.log('  Com. Admin:    manager@chamanes.app   / Admin1234!')
  console.log('  Manager:       mgrtest@chamanes.app   / Admin1234!')
  console.log('  Guard:         guard@chamanes.app     / Admin1234!')
  console.log('  Resident #1:   resident@chamanes.app  / Resident1234! (PENDING payment)')
  console.log('  Resident #11:  ana.f@chamanes.app     / Resident1234! (paid)')
  console.log('  25 units  |  20 residents  |  10 pending payments')
  console.log('  17 reservations (5 PENDING approval)  |  8 visitor passes  |  22 access events')
  console.log('  6 work orders (urgent fuga + puerta, limpieza, jardín, etc.)')
  console.log('═══════════════════════════════════════════')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

/**
 * seed-demo.ts — "Residencial Las Palmas"
 *
 * Creates a fully-populated second community for QA/testing:
 *  • 20 units (4 blocks, A–D)
 *  • 1 COMMUNITY_ADMIN + 1 MANAGER
 *  • 3 guards, 2 maintenance staff
 *  • 15 residents across units
 *  • 6 common areas
 *  • Payments: PENDING, COMPLETED, FAILED spread over 3 months
 *  • Reservations: PENDING, CONFIRMED, CANCELLED, COMPLETED
 *  • Work orders: all statuses
 *  • Visitor passes: ACTIVE, USED, EXPIRED
 *  • Access events: last 7 days
 *  • Forum posts
 *
 * Run: cd apps/backend && npx tsx prisma/seed-demo.ts
 */

import { PrismaClient, UserRole, PaymentStatus, PaymentType, ReservationStatus, WorkOrderStatus, WorkOrderPriority, AccessEventType, AccessMethod, VisitorPassStatus, OccupancyType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

const HASH = (pw: string) => bcrypt.hash(pw, 12)

function daysAgo(d: number) { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt }
function daysFromNow(d: number) { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt }
function monthsAgo(m: number, day = 15) {
  const dt = new Date(); dt.setMonth(dt.getMonth() - m); dt.setDate(day); return dt
}

async function main() {
  console.log('🌴 Seeding Residencial Las Palmas...')

  // ── Community ─────────────────────────────────────────────────
  const community = await prisma.community.upsert({
    where: { id: 'seed-las-palmas' },
    update: {},
    create: {
      id: 'seed-las-palmas',
      name: 'Residencial Las Palmas',
      address: 'Av. Las Palmas 450',
      city: 'Guadalajara',
      state: 'Jalisco',
      country: 'MX',
      zipCode: '44100',
      phone: '3312345678',
      email: 'admin@laspalmas.mx',
      timezone: 'America/Mexico_City',
      currency: 'MXN',
      totalUnits: 20,
      settings: {
        maintenanceFeeAmount: 1800,
        paymentDueDay: 5,
        lateFeePct: 10,
      },
    },
  })
  console.log('  ✓ Community:', community.name)

  // ── Users ──────────────────────────────────────────────────────
  const usersData = [
    // Admin
    { id: 'seed-lp-admin', email: 'admin.palmas@chamanes.app', firstName: 'Roberto', lastName: 'Herrera', role: UserRole.COMMUNITY_ADMIN, pw: 'Admin123!@#' },
    // Manager
    { id: 'seed-lp-mgr', email: 'manager.palmas@chamanes.app', firstName: 'Carmen', lastName: 'Vega', role: UserRole.MANAGER, pw: 'Manager123!@#' },
    // Guards
    { id: 'seed-lp-guard1', email: 'guardia1.palmas@chamanes.app', firstName: 'Luis', lastName: 'Pérez', role: UserRole.GUARD, pw: 'Guard123!@#' },
    { id: 'seed-lp-guard2', email: 'guardia2.palmas@chamanes.app', firstName: 'Mario', lastName: 'Salinas', role: UserRole.GUARD, pw: 'Guard123!@#' },
    { id: 'seed-lp-guard3', email: 'guardia3.palmas@chamanes.app', firstName: 'Juan', lastName: 'Torres', role: UserRole.GUARD, pw: 'Guard123!@#' },
    // Staff
    { id: 'seed-lp-staff1', email: 'mtto1.palmas@chamanes.app', firstName: 'Pedro', lastName: 'Ramírez', role: UserRole.STAFF, pw: 'Staff123!@#' },
    { id: 'seed-lp-staff2', email: 'limpieza.palmas@chamanes.app', firstName: 'Rosa', lastName: 'Mendoza', role: UserRole.STAFF, pw: 'Staff123!@#' },
    // Residents
    { id: 'seed-lp-r01', email: 'ana.garcia@mail.com', firstName: 'Ana', lastName: 'García', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r02', email: 'carlos.lopez@mail.com', firstName: 'Carlos', lastName: 'López', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r03', email: 'sofia.martinez@mail.com', firstName: 'Sofía', lastName: 'Martínez', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r04', email: 'jorge.ruiz@mail.com', firstName: 'Jorge', lastName: 'Ruiz', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r05', email: 'maria.sanchez@mail.com', firstName: 'María', lastName: 'Sánchez', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r06', email: 'diego.fernandez@mail.com', firstName: 'Diego', lastName: 'Fernández', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r07', email: 'lucia.morales@mail.com', firstName: 'Lucía', lastName: 'Morales', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r08', email: 'ricardo.jimenez@mail.com', firstName: 'Ricardo', lastName: 'Jiménez', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r09', email: 'patricia.reyes@mail.com', firstName: 'Patricia', lastName: 'Reyes', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r10', email: 'alejandro.cruz@mail.com', firstName: 'Alejandro', lastName: 'Cruz', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r11', email: 'valentina.gomez@mail.com', firstName: 'Valentina', lastName: 'Gómez', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r12', email: 'andres.vargas@mail.com', firstName: 'Andrés', lastName: 'Vargas', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r13', email: 'gabriela.castillo@mail.com', firstName: 'Gabriela', lastName: 'Castillo', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r14', email: 'fernando.ramos@mail.com', firstName: 'Fernando', lastName: 'Ramos', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
    { id: 'seed-lp-r15', email: 'isabela.torres@mail.com', firstName: 'Isabela', lastName: 'Torres', role: UserRole.RESIDENT, pw: 'Vecino123!@#' },
  ]

  const users: any[] = []
  for (const u of usersData) {
    const hash = await HASH(u.pw)
    const user = await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
        passwordHash: hash, globalRole: u.role, isActive: true, isVerified: true,
        idVerificationStatus: u.role === UserRole.RESIDENT ? (
          u.id.endsWith('r01') ? 'APPROVED' :
          u.id.endsWith('r02') ? 'PENDING' :
          u.id.endsWith('r03') ? 'REJECTED' : 'NOT_SUBMITTED'
        ) : 'NOT_SUBMITTED',
        idVerified: u.id.endsWith('r01'),
      },
    })
    users.push({ ...user, pw: u.pw, role: u.role })
  }
  console.log(`  ✓ ${users.length} users`)

  // ── CommunityUsers ─────────────────────────────────────────────
  for (const u of usersData) {
    await prisma.communityUser.upsert({
      where: { userId_communityId: { userId: u.id, communityId: community.id } },
      update: {},
      create: { userId: u.id, communityId: community.id, role: u.role, isActive: true },
    })
  }
  console.log('  ✓ CommunityUsers')

  // ── Units ──────────────────────────────────────────────────────
  const blocks = ['A', 'B', 'C', 'D']
  const unitNumbers = blocks.flatMap((b) => [1, 2, 3, 4, 5].map((n) => `${b}-${n}`))
  const unitIds: string[] = []

  for (const num of unitNumbers) {
    const u = await prisma.unit.upsert({
      where: { communityId_number: { communityId: community.id, number: num } },
      update: {},
      create: {
        communityId: community.id,
        number: num,
        block: num[0],
        floor: parseInt(num[2]) > 3 ? 2 : 1,
        type: 'apartment',
        sqMeters: 85 + Math.floor(Math.random() * 30),
        parkingSpots: 1,
        isOccupied: false,
      },
    })
    unitIds.push(u.id)
  }
  console.log(`  ✓ ${unitIds.length} units`)

  // ── Assign residents to units ─────────────────────────────────
  const residentIds = usersData.filter((u) => u.role === UserRole.RESIDENT).map((u) => u.id)
  for (let i = 0; i < residentIds.length; i++) {
    const unitId = unitIds[i]
    const userId = residentIds[i]
    const cu = await prisma.communityUser.findUnique({ where: { userId_communityId: { userId, communityId: community.id } } })
    if (!cu) continue
    await prisma.unitResident.upsert({
      where: { unitId_communityUserId: { unitId, communityUserId: cu.id } },
      update: {},
      create: { unitId, communityUserId: cu.id, isPrimary: true, occupancyType: i % 4 === 0 ? OccupancyType.TENANT : OccupancyType.OWNER, moveInDate: daysAgo(180 + i * 10) },
    })
    await prisma.unit.update({ where: { id: unitId }, data: { isOccupied: true } })
  }
  console.log('  ✓ Residents assigned to units')

  // ── Staff records ──────────────────────────────────────────────
  const staffDefs = [
    { userId: 'seed-lp-guard1', position: 'Guardia de seguridad', department: 'Seguridad', employeeId: 'LP-001' },
    { userId: 'seed-lp-guard2', position: 'Guardia de seguridad', department: 'Seguridad', employeeId: 'LP-002' },
    { userId: 'seed-lp-guard3', position: 'Guardia nocturno', department: 'Seguridad', employeeId: 'LP-003' },
    { userId: 'seed-lp-staff1', position: 'Técnico de mantenimiento', department: 'Mantenimiento', employeeId: 'LP-004' },
    { userId: 'seed-lp-staff2', position: 'Personal de limpieza', department: 'Limpieza', employeeId: 'LP-005' },
  ]
  const staffRecords: any[] = []
  for (const s of staffDefs) {
    const staff = await prisma.staff.upsert({
      where: { userId: s.userId },
      update: {},
      create: { communityId: community.id, userId: s.userId, position: s.position, department: s.department, employeeId: s.employeeId, startDate: daysAgo(365), isActive: true },
    })
    staffRecords.push(staff)
  }
  console.log('  ✓ Staff')

  // ── Common Areas ───────────────────────────────────────────────
  const areasDefs = [
    { name: 'Alberca', description: 'Alberca olímpica temperada', capacity: 30, openTime: '07:00', closeTime: '21:00', slotDurationMins: 90, requiresApproval: false, hasFee: false, feeAmount: 0 },
    { name: 'Salón de Eventos', description: 'Salón con capacidad para 80 personas', capacity: 80, openTime: '08:00', closeTime: '23:00', slotDurationMins: 240, requiresApproval: true, hasFee: true, feeAmount: 1500 },
    { name: 'Gimnasio', description: 'Equipado con cardio y pesas', capacity: 20, openTime: '06:00', closeTime: '22:00', slotDurationMins: 60, requiresApproval: false, hasFee: false, feeAmount: 0 },
    { name: 'Área de BBQ', description: 'Parrillas y mesas al aire libre', capacity: 25, openTime: '10:00', closeTime: '21:00', slotDurationMins: 180, requiresApproval: false, hasFee: true, feeAmount: 500 },
    { name: 'Cancha de Tenis', description: 'Cancha reglamentaria de tenis', capacity: 4, openTime: '07:00', closeTime: '20:00', slotDurationMins: 60, requiresApproval: false, hasFee: false, feeAmount: 0 },
    { name: 'Salón de Juegos', description: 'Mesa de billar, ping pong, futbolito', capacity: 15, openTime: '10:00', closeTime: '22:00', slotDurationMins: 120, requiresApproval: false, hasFee: false, feeAmount: 0 },
  ]
  const areas: any[] = []
  for (const a of areasDefs) {
    const area = await prisma.commonArea.create({ data: { communityId: community.id, ...a, rules: `Máximo ${a.capacity} personas. Dejar limpia el área.`, isActive: true } }).catch(() => null)
    if (area) areas.push(area)
  }
  console.log(`  ✓ ${areas.length} common areas`)

  // ── Reservations ───────────────────────────────────────────────
  const reservationDefs = [
    // CONFIRMED
    { userId: 'seed-lp-r01', areaIdx: 0, startOff: 2, hours: 2, status: ReservationStatus.CONFIRMED, title: 'Tarde familiar' },
    { userId: 'seed-lp-r02', areaIdx: 2, startOff: 1, hours: 1, status: ReservationStatus.CONFIRMED, title: 'Rutina matutina' },
    { userId: 'seed-lp-r03', areaIdx: 1, startOff: 10, hours: 4, status: ReservationStatus.CONFIRMED, title: 'Cumpleaños Sofía' },
    // PENDING
    { userId: 'seed-lp-r04', areaIdx: 3, startOff: 5, hours: 3, status: ReservationStatus.PENDING, title: 'Reunión familiar' },
    { userId: 'seed-lp-r05', areaIdx: 4, startOff: 3, hours: 1, status: ReservationStatus.PENDING, title: 'Partido amistoso' },
    { userId: 'seed-lp-r06', areaIdx: 1, startOff: 15, hours: 5, status: ReservationStatus.PENDING, title: 'Graduación' },
    // COMPLETED
    { userId: 'seed-lp-r07', areaIdx: 0, startOff: -5, hours: 2, status: ReservationStatus.COMPLETED, title: 'Nado dominical' },
    { userId: 'seed-lp-r08', areaIdx: 2, startOff: -3, hours: 1, status: ReservationStatus.COMPLETED, title: 'Ejercicio' },
    { userId: 'seed-lp-r09', areaIdx: 5, startOff: -7, hours: 2, status: ReservationStatus.COMPLETED, title: 'Juegos en familia' },
    // CANCELLED
    { userId: 'seed-lp-r10', areaIdx: 1, startOff: -2, hours: 4, status: ReservationStatus.CANCELLED, title: 'Evento cancelado' },
    { userId: 'seed-lp-r11', areaIdx: 3, startOff: -1, hours: 2, status: ReservationStatus.CANCELLED, title: 'BBQ cancelado' },
  ]

  for (const r of reservationDefs) {
    if (areas[r.areaIdx]) {
      const start = new Date(); start.setDate(start.getDate() + r.startOff); start.setHours(10, 0, 0)
      const end = new Date(start); end.setHours(start.getHours() + r.hours)
      await prisma.reservation.create({
        data: {
          commonAreaId: areas[r.areaIdx].id,
          userId: r.userId,
          communityId: community.id,
          title: r.title,
          startTime: start,
          endTime: end,
          status: r.status,
          attendees: 4 + Math.floor(Math.random() * 10),
          feeAmount: areas[r.areaIdx].feeAmount,
        },
      })
    }
  }
  console.log('  ✓ Reservations')

  // ── Payments ───────────────────────────────────────────────────
  // 3 months of maintenance fees for 15 residents + some fines/failed
  const now = new Date()
  let paymentsCreated = 0

  for (let resIdx = 0; resIdx < residentIds.length; resIdx++) {
    const userId = residentIds[resIdx]
    const unitId = unitIds[resIdx]

    for (let month = 0; month < 3; month++) {
      const periodMonth = ((now.getMonth() - month + 12) % 12) + 1
      const periodYear = now.getMonth() - month < 0 ? now.getFullYear() - 1 : now.getFullYear()

      // Determine status for variety
      let status: PaymentStatus
      if (month === 0) {
        // Current month: some pending, some completed
        status = resIdx % 3 === 0 ? PaymentStatus.PENDING : PaymentStatus.COMPLETED
      } else if (month === 1) {
        // Last month: mostly completed, a few failed
        status = resIdx % 7 === 0 ? PaymentStatus.FAILED : PaymentStatus.COMPLETED
      } else {
        // 2 months ago: all completed
        status = PaymentStatus.COMPLETED
      }

      const dueDate = new Date(periodYear, periodMonth - 1, 5)
      const paidAt = status === 'COMPLETED' ? new Date(dueDate.getTime() + Math.random() * 10 * 86400000) : null

      await prisma.payment.create({
        data: {
          communityId: community.id,
          userId,
          unitId,
          amount: 1800,
          currency: 'MXN',
          type: PaymentType.MAINTENANCE_FEE,
          description: `Cuota de mantenimiento ${periodMonth}/${periodYear}`,
          status,
          dueDate,
          paidAt,
          periodMonth,
          periodYear,
          paymentMethod: status === 'COMPLETED' ? (resIdx % 2 === 0 ? 'CASH' : 'TRANSFER') : 'STRIPE',
          lateFeeApplied: status === 'FAILED',
          lateFeeAmount: status === 'FAILED' ? 180 : 0,
        },
      })
      paymentsCreated++
    }
  }

  // Add some fines
  const fineResidents = [residentIds[0], residentIds[3], residentIds[7]]
  for (const userId of fineResidents) {
    const unitId = unitIds[residentIds.indexOf(userId)]
    await prisma.payment.create({
      data: {
        communityId: community.id,
        userId,
        unitId,
        amount: 500,
        currency: 'MXN',
        type: PaymentType.FINE,
        description: 'Multa por uso inadecuado de estacionamiento',
        status: PaymentStatus.PENDING,
        dueDate: daysFromNow(10),
      },
    })
    paymentsCreated++
  }
  console.log(`  ✓ ${paymentsCreated} payments (PENDING/COMPLETED/FAILED/fines)`)

  // ── Work Orders ────────────────────────────────────────────────
  const workOrdersDefs = [
    { title: 'Fuga de agua en lobby principal', description: 'Se detectó fuga en tubería del lobby, requiere plomero urgente.', category: 'maintenance', priority: WorkOrderPriority.URGENT, status: WorkOrderStatus.IN_PROGRESS, location: 'Lobby principal', staffIdx: 3 },
    { title: 'Cambio de focos jardín bloque A', description: 'Varios focos del jardín bloque A han fundido.', category: 'maintenance', priority: WorkOrderPriority.LOW, status: WorkOrderStatus.OPEN, location: 'Jardín Bloque A', staffIdx: -1 },
    { title: 'Limpieza profunda alberca', description: 'Limpieza mensual de alberca y equipo de filtrado.', category: 'cleaning', priority: WorkOrderPriority.MEDIUM, status: WorkOrderStatus.ASSIGNED, location: 'Alberca', staffIdx: 4 },
    { title: 'Pintura pasillos bloque B', description: 'Los pasillos del bloque B requieren repintura.', category: 'maintenance', priority: WorkOrderPriority.LOW, status: WorkOrderStatus.COMPLETED, location: 'Bloque B', staffIdx: 3 },
    { title: 'Reparación cámara puerta trasera', description: 'Cámara de seguridad en puerta trasera sin imagen.', category: 'security', priority: WorkOrderPriority.HIGH, status: WorkOrderStatus.ASSIGNED, location: 'Puerta trasera', staffIdx: 0 },
    { title: 'Mantenimiento elevador bloque C', description: 'Revisión semestral obligatoria del elevador.', category: 'maintenance', priority: WorkOrderPriority.MEDIUM, status: WorkOrderStatus.OPEN, location: 'Bloque C', staffIdx: -1 },
    { title: 'Limpieza salón de eventos post-fiesta', description: 'Limpieza a fondo del salón tras evento del fin de semana.', category: 'cleaning', priority: WorkOrderPriority.HIGH, status: WorkOrderStatus.COMPLETED, location: 'Salón de Eventos', staffIdx: 4 },
    { title: 'Revisión sistema de intercomunicadores', description: 'Varios departamentos reportan falla en intercomunicador.', category: 'maintenance', priority: WorkOrderPriority.MEDIUM, status: WorkOrderStatus.IN_PROGRESS, location: 'General', staffIdx: 3 },
  ]

  for (const wo of workOrdersDefs) {
    const workOrder = await prisma.workOrder.create({
      data: {
        communityId: community.id,
        title: wo.title,
        description: wo.description,
        category: wo.category,
        priority: wo.priority,
        status: wo.status,
        location: wo.location,
        imageUrls: [],
        dueDate: daysFromNow(wo.priority === 'URGENT' ? 1 : wo.priority === 'HIGH' ? 3 : 7),
        completedAt: wo.status === WorkOrderStatus.COMPLETED ? daysAgo(2) : null,
      },
    })
    if (wo.staffIdx >= 0 && staffRecords[wo.staffIdx]) {
      await prisma.workOrderAssignment.create({
        data: { workOrderId: workOrder.id, staffId: staffRecords[wo.staffIdx].id },
      })
    }
  }
  console.log(`  ✓ ${workOrdersDefs.length} work orders`)

  // ── Visitor Passes ─────────────────────────────────────────────
  const visitorPassDefs = [
    { creatorId: 'seed-lp-r01', name: 'Marco Flores', phone: '3398765432', status: VisitorPassStatus.ACTIVE, validFrom: daysAgo(0), validUntil: daysFromNow(3) },
    { creatorId: 'seed-lp-r02', name: 'Elena Rivas', phone: '3387654321', status: VisitorPassStatus.ACTIVE, validFrom: daysAgo(0), validUntil: daysFromNow(1) },
    { creatorId: 'seed-lp-r03', name: 'Fontanero SABO', phone: '3376543210', status: VisitorPassStatus.USED, validFrom: daysAgo(2), validUntil: daysAgo(1), usedCount: 1 },
    { creatorId: 'seed-lp-r04', name: 'DHL Paquetería', phone: null, status: VisitorPassStatus.USED, validFrom: daysAgo(1), validUntil: daysAgo(0), usedCount: 1 },
    { creatorId: 'seed-lp-r05', name: 'Familia González', phone: '3365432109', status: VisitorPassStatus.EXPIRED, validFrom: daysAgo(10), validUntil: daysAgo(3) },
    { creatorId: 'seed-lp-r06', name: 'Técnico TELMEX', phone: '3354321098', status: VisitorPassStatus.EXPIRED, validFrom: daysAgo(7), validUntil: daysAgo(5) },
    { creatorId: 'seed-lp-r07', name: 'Amigos de Lucía', phone: '3343210987', status: VisitorPassStatus.ACTIVE, validFrom: daysAgo(0), validUntil: daysFromNow(7) },
  ]
  for (const vp of visitorPassDefs) {
    await prisma.visitorPass.create({
      data: {
        communityId: community.id,
        createdById: vp.creatorId,
        visitorName: vp.name,
        visitorPhone: vp.phone,
        qrCode: `LP-QR-${randomUUID()}`,
        status: vp.status,
        validFrom: vp.validFrom,
        validUntil: vp.validUntil,
        maxUses: 3,
        usedCount: (vp as any).usedCount ?? 0,
      },
    })
  }
  console.log(`  ✓ ${visitorPassDefs.length} visitor passes`)

  // ── Access Events ─────────────────────────────────────────────
  const names = ['Ana García', 'Carlos López', 'Sofía Martínez', 'DHL Mensajería', 'Pedro Ramírez (mantenimiento)', 'Luis Pérez (guardia)', 'Visitante genérico']
  for (let d = 6; d >= 0; d--) {
    const count = 6 + Math.floor(Math.random() * 8)
    for (let i = 0; i < count; i++) {
      const hour = 7 + Math.floor(Math.random() * 14)
      const dt = daysAgo(d); dt.setHours(hour, Math.floor(Math.random() * 60))
      await prisma.accessEvent.create({
        data: {
          communityId: community.id,
          type: Math.random() > 0.5 ? AccessEventType.ENTRY : AccessEventType.EXIT,
          method: Math.random() > 0.4 ? AccessMethod.QR_CODE : AccessMethod.MANUAL_GUARD,
          personName: names[Math.floor(Math.random() * names.length)],
          personType: Math.random() > 0.6 ? 'resident' : Math.random() > 0.3 ? 'visitor' : 'staff',
          isAllowed: Math.random() > 0.05,
          createdAt: dt,
        },
      })
    }
  }
  console.log('  ✓ Access events (7 days)')

  // ── Forum Posts ────────────────────────────────────────────────
  const forumPostsDefs = [
    { userId: 'seed-lp-admin', body: '¡Bienvenidos al foro de Residencial Las Palmas! Aquí pueden comunicarse entre vecinos, hacer preguntas y reportar inquietudes. 🏡' },
    { userId: 'seed-lp-r01', body: '¿Alguien sabe a qué hora abre el gimnasio los fines de semana? No encuentro el horario.' },
    { userId: 'seed-lp-r03', body: 'Aviso: el martes 15 habrá mantenimiento en el elevador del bloque B de 9am a 12pm. Disculpen las molestias.' },
    { userId: 'seed-lp-r05', body: 'Perdí mis llaves cerca de la alberca, si alguien las encontró por favor me avisa. Son de arete rojo. Gracias 🙏' },
    { userId: 'seed-lp-mgr', body: 'Recordatorio: el pago de mantenimiento vence el día 5 de cada mes. Cualquier duda en la oficina administrativa.' },
    { userId: 'seed-lp-r08', body: 'La actividad de yoga los sábados en el jardín ha sido increíble, ¡gracias a todos los que se unen! 🧘‍♀️' },
  ]
  for (const fp of forumPostsDefs) {
    await prisma.forumPost.create({
      data: { communityId: community.id, authorId: fp.userId, body: fp.body, likesCount: Math.floor(Math.random() * 12) },
    })
  }
  console.log(`  ✓ ${forumPostsDefs.length} forum posts`)

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n🎉 Residencial Las Palmas seeded successfully!')
  console.log('\n📋 Test credentials:')
  console.log('  COMMUNITY_ADMIN: admin.palmas@chamanes.app / Admin123!@#')
  console.log('  MANAGER:         manager.palmas@chamanes.app / Manager123!@#')
  console.log('  GUARD:           guardia1.palmas@chamanes.app / Guard123!@#')
  console.log('  RESIDENT:        ana.garcia@mail.com / Vecino123!@#')
  console.log('\n📊 Data summary:')
  console.log('  • 20 units (Blocks A–D)')
  console.log('  • 15 residents, 3 guards, 2 maintenance staff')
  console.log('  • 6 common areas')
  console.log(`  • ${paymentsCreated} payments (PENDING/COMPLETED/FAILED)`)
  console.log('  • 11 reservations (all statuses)')
  console.log('  • 8 work orders (all statuses + priorities)')
  console.log('  • 7 visitor passes (ACTIVE/USED/EXPIRED)')
  console.log('  • ~50 access events (last 7 days)')
  console.log('  • 6 forum posts')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

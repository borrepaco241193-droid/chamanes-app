import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// ============================================================
// Resident Management Routes (COMMUNITY_ADMIN | MANAGER | SUPER_ADMIN)
//
// GET    /:communityId/residents                              — list
// GET    /:communityId/residents/:userId                      — detail
// POST   /:communityId/residents                             — create resident + unit
// PATCH  /:communityId/residents/:userId                      — update
// DELETE /:communityId/residents/:userId                      — deactivate
//
// POST   /:communityId/units                                  — create unit
// PATCH  /:communityId/units/:unitId                          — update unit
//
// POST   /:communityId/units/:unitId/members                  — add member
// PATCH  /:communityId/units/:unitId/members/:memberId        — update member
// DELETE /:communityId/units/:unitId/members/:memberId        — remove member
//
// POST   /:communityId/units/:unitId/vehicles                 — add vehicle
// PATCH  /:communityId/units/:unitId/vehicles/:vehicleId      — update vehicle
// DELETE /:communityId/units/:unitId/vehicles/:vehicleId      — remove vehicle
//
// PATCH  /:communityId/payments/:paymentId/mark-paid          — cash/transfer
// POST   /:communityId/payments/:paymentId/upload-proof       — transfer screenshot
// ============================================================

const ADMIN_ROLES: UserRole[] = [
  UserRole.COMMUNITY_ADMIN,
  UserRole.MANAGER,
  UserRole.SUPER_ADMIN,
]

function isAdminRole(role?: string | null) {
  return ADMIN_ROLES.includes(role as UserRole)
}

// ── Validation schemas ─────────────────────────────────────────

const createUnitSchema = z.object({
  number:      z.string().min(1),
  block:       z.string().optional().nullable(),
  floor:       z.number().int().optional().nullable(),
  type:        z.string().default('house'),
  sqMeters:    z.number().positive().optional().nullable(),
  parkingSpots: z.number().int().min(0).default(0),
  notes:       z.string().optional().nullable(),
  ownerName:   z.string().optional().nullable(),
  ownerPhone:  z.string().optional().nullable(),
  ownerEmail:  z.string().email().optional().nullable(),
})

const updateUnitSchema = createUnitSchema.partial()

const createResidentSchema = z.object({
  // User fields
  firstName:    z.string().min(1),
  lastName:     z.string().min(1),
  email:        z.string().email(),
  phone:        z.string().optional().nullable(),
  password:     z.string().min(8).optional(), // if omitted, auto-generated
  // Community role
  role:         z.enum(['RESIDENT', 'COMMUNITY_ADMIN', 'MANAGER', 'GUARD', 'STAFF']).default('RESIDENT'),
  // Unit assignment (optional — can be assigned later)
  unitId:       z.string().optional().nullable(),
  occupancyType: z.enum(['OWNER', 'TENANT']).default('OWNER'),
  isPrimary:    z.boolean().default(true),
  moveInDate:   z.string().optional().nullable(),
  // Emergency contact
  emergencyContactName:     z.string().optional().nullable(),
  emergencyContactPhone:    z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
})

const updateResidentSchema = z.object({
  firstName:                z.string().min(1).optional(),
  lastName:                 z.string().min(1).optional(),
  email:                    z.string().email().optional(),
  phone:                    z.string().optional().nullable(),
  emergencyContactName:     z.string().optional().nullable(),
  emergencyContactPhone:    z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
  occupancyType:            z.enum(['OWNER', 'TENANT']).optional(),
  ownerName:                z.string().optional().nullable(),
  ownerPhone:               z.string().optional().nullable(),
  ownerEmail:               z.string().email().optional().nullable(),
  unitEmergencyContactName:     z.string().optional().nullable(),
  unitEmergencyContactPhone:    z.string().optional().nullable(),
  unitEmergencyContactRelation: z.string().optional().nullable(),
  unitNotes:                z.string().optional().nullable(),
})

const memberSchema = z.object({
  name:           z.string().min(1),
  relationship:   z.enum(['SPOUSE','CHILD','PARENT','SIBLING','RELATIVE','CARETAKER','EMPLOYEE','PARTNER','OTHER']).default('OTHER'),
  phone:          z.string().optional().nullable(),
  email:          z.string().email().optional().nullable(),
  idDocument:     z.string().optional().nullable(),
  canGrantAccess: z.boolean().default(false),
  notes:          z.string().optional().nullable(),
})

const vehicleSchema = z.object({
  type:        z.enum(['CAR','MOTORCYCLE','TRUCK','VAN','OTHER']).default('CAR'),
  make:        z.string().min(1),
  model:       z.string().min(1),
  year:        z.number().int().min(1900).max(2030).optional().nullable(),
  color:       z.string().min(1),
  plateNumber: z.string().min(1),
  sticker:     z.string().optional().nullable(),
  notes:       z.string().optional().nullable(),
})

const markPaidSchema = z.object({
  paymentMethod:   z.enum(['CASH', 'TRANSFER', 'CHECK']).default('CASH'),
  cashNotes:       z.string().optional().nullable(),
  transferProofUrl: z.string().url().optional().nullable(),
  amount:          z.number().positive().optional(),
})

// ── Plugin ────────────────────────────────────────────────────

const residentRoutes: FastifyPluginAsync = async (fastify) => {

  // ══════════════════════════════════════════════════════════
  // UNITS
  // ══════════════════════════════════════════════════════════

  // ── CREATE unit ────────────────────────────────────────────
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/units',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId } = req.params
      const body = createUnitSchema.parse(req.body)

      // Verify community exists (prevents FK crash with a clear error)
      const community = await fastify.prisma.community.findUnique({ where: { id: communityId } })
      if (!community) {
        return reply.code(404).send({ error: 'NotFound', message: 'Comunidad no encontrada. Verifica tu sesión.' })
      }

      // Check unit number uniqueness within community
      const existing = await fastify.prisma.unit.findUnique({
        where: { communityId_number: { communityId, number: body.number } },
      })
      if (existing) {
        return reply.code(409).send({ error: 'Conflict', message: `La unidad "${body.number}" ya existe en esta comunidad` })
      }

      const unit = await fastify.prisma.unit.create({
        data: { ...body, communityId },
      })

      // Update community totalUnits count
      await fastify.prisma.community.update({
        where: { id: communityId },
        data: { totalUnits: { increment: 1 } },
      })

      return reply.code(201).send(unit)
    },
  )

  // ── LIST units (with optional stats) ──────────────────────
  fastify.get<{ Params: { communityId: string }; Querystring: { stats?: string } }>(
    '/:communityId/units',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId } = req.params
      const withStats = req.query.stats === 'true'

      const units = await fastify.prisma.unit.findMany({
        where: { communityId },
        orderBy: [{ block: 'asc' }, { number: 'asc' }],
        select: {
          id: true, number: true, block: true, floor: true,
          type: true, isOccupied: true, parkingSpots: true,
          ownerName: true, ownerPhone: true, ownerEmail: true,
          notes: true, sqMeters: true,
          _count: { select: { residents: { where: { moveOutDate: null } } } },
          residents: withStats ? {
            where: { moveOutDate: null },
            include: {
              communityUser: {
                include: {
                  user: { select: { firstName: true, lastName: true, email: true, phone: true } },
                },
              },
            },
          } : false,
          householdMembers: withStats ? { where: { isActive: true }, select: { id: true } } : false,
          vehicles: withStats ? { where: { isActive: true }, select: { id: true, plateNumber: true, make: true, model: true } } : false,
        },
      })

      const total    = units.length
      const occupied = units.filter((u) => u.isOccupied).length
      const vacant   = total - occupied

      return reply.send({ units, stats: { total, occupied, vacant } })
    },
  )

  // ── UNITS REPORT — CSV download ────────────────────────────
  fastify.get<{ Params: { communityId: string }; Querystring: { format?: string } }>(
    '/:communityId/units/report',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId } = req.params

      const units = await fastify.prisma.unit.findMany({
        where: { communityId },
        orderBy: [{ block: 'asc' }, { number: 'asc' }],
        include: {
          residents: {
            where: { moveOutDate: null },
            include: {
              communityUser: {
                include: {
                  user: { select: { firstName: true, lastName: true, email: true, phone: true } },
                },
              },
            },
          },
          vehicles: { where: { isActive: true } },
          householdMembers: { where: { isActive: true } },
        },
      })

      const rows = [
        ['Bloque', 'Unidad', 'Piso', 'Tipo', 'm²', 'Estacionamientos', 'Estado', 'Ocupación', 'Residente', 'Email', 'Teléfono', 'Propietario', 'Tel. Propietario', 'Vehículos', 'Habitantes adicionales', 'Notas'],
        ...units.map((u) => {
          const resident = u.residents[0]
          const cu = resident?.communityUser
          const residentName = cu ? `${cu.user.firstName} ${cu.user.lastName}` : ''
          return [
            u.block ?? '',
            u.number,
            u.floor ?? '',
            u.type,
            u.sqMeters ?? '',
            u.parkingSpots,
            u.isOccupied ? 'Habitada' : 'Vacante',
            resident?.occupancyType === 'TENANT' ? 'Inquilino' : (u.isOccupied ? 'Propietario' : ''),
            residentName,
            cu?.user.email ?? '',
            cu?.user.phone ?? '',
            u.ownerName ?? '',
            u.ownerPhone ?? '',
            u.vehicles.map((v) => v.plateNumber).join(' / '),
            u.householdMembers.length,
            (u.notes ?? '').replace(/,/g, ';'),
          ]
        }),
      ]

      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="unidades.csv"')
      return reply.send('\uFEFF' + csv) // BOM for Excel
    },
  )

  // ── UPDATE unit ────────────────────────────────────────────
  fastify.patch<{ Params: { communityId: string; unitId: string }; Body: unknown }>(
    '/:communityId/units/:unitId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, unitId } = req.params
      const body = updateUnitSchema.parse(req.body)

      const unit = await fastify.prisma.unit.updateMany({
        where: { id: unitId, communityId },
        data: body,
      })
      if (unit.count === 0) {
        const err = new Error('Unit not found') as any; err.statusCode = 404; throw err
      }
      return reply.send({ ok: true })
    },
  )

  // ══════════════════════════════════════════════════════════
  // RESIDENTS — LIST / GET / CREATE / UPDATE / DELETE
  // ══════════════════════════════════════════════════════════

  // ── LIST residents ─────────────────────────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { search?: string; block?: string; page?: string; limit?: string }
  }>(
    '/:communityId/residents',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId } = req.params
      const { search, block } = req.query
      const page  = parseInt(req.query.page  ?? '1')
      const limit = parseInt(req.query.limit ?? '50')
      const skip  = (page - 1) * limit

      const where: any = {
        communityId,
        role: { in: [UserRole.RESIDENT, UserRole.COMMUNITY_ADMIN, UserRole.MANAGER] },
        isActive: true,
      }

      if (search) {
        where.user = {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName:  { contains: search, mode: 'insensitive' } },
            { email:     { contains: search, mode: 'insensitive' } },
          ],
        }
      }

      const [communityUsers, total] = await Promise.all([
        fastify.prisma.communityUser.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
            },
            unitResidents: {
              where: { moveOutDate: null },
              include: {
                unit: {
                  select: {
                    id: true, number: true, block: true, isOccupied: true,
                    ownerName: true, ownerPhone: true,
                    emergencyContactName: true, emergencyContactPhone: true,
                  },
                },
              },
            },
          },
        }),
        fastify.prisma.communityUser.count({ where }),
      ])

      let results = communityUsers
      if (block) {
        results = communityUsers.filter((cu) =>
          cu.unitResidents.some((ur) => ur.unit.block === block),
        )
      }

      const userIds = results.map((cu) => cu.userId)
      const pendingPayments = await fastify.prisma.payment.groupBy({
        by: ['userId'],
        where: { communityId, userId: { in: userIds }, status: 'PENDING' },
        _count: { id: true },
        _sum: { amount: true },
      })
      const pendingMap = new Map(pendingPayments.map((p) => [p.userId, p]))

      const residents = results.map((cu) => ({
        id:              cu.userId,
        communityUserId: cu.id,
        role:            cu.role,
        phone:           cu.phone,
        emergencyContactName:     cu.emergencyContactName,
        emergencyContactPhone:    cu.emergencyContactPhone,
        emergencyContactRelation: cu.emergencyContactRelation,
        user: cu.user,
        units: cu.unitResidents.map((ur) => ({
          ...ur.unit,
          occupancyType: ur.occupancyType,
          isPrimary:     ur.isPrimary,
          moveInDate:    ur.moveInDate,
        })),
        pendingPayments: pendingMap.get(cu.userId)?._count.id ?? 0,
        pendingAmount:   Number(pendingMap.get(cu.userId)?._sum.amount ?? 0),
      }))

      return reply.send({ residents, total, page, limit, pages: Math.ceil(total / limit) })
    },
  )

  // ── CREATE resident ────────────────────────────────────────
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/residents',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId } = req.params
      const body = createResidentSchema.parse(req.body)

      // Role privilege check — MANAGER can only create RESIDENT, GUARD, STAFF
      const requesterIsTopAdmin =
        req.user.role === 'SUPER_ADMIN' ||
        req.user.communityRole === 'SUPER_ADMIN' ||
        req.user.communityRole === 'COMMUNITY_ADMIN'

      if (!requesterIsTopAdmin && (body.role === 'MANAGER' || body.role === 'COMMUNITY_ADMIN')) {
        return reply.code(403).send({ error: 'Forbidden', message: 'Solo el administrador puede crear managers o administradores' })
      }

      // Look up user by email
      const existingUser = await fastify.prisma.user.findUnique({ where: { email: body.email } })

      let userId: string

      // Resolve globalRole for MANAGER/COMMUNITY_ADMIN so JWT role field is accurate
      const targetGlobalRole = (body.role === 'MANAGER' || body.role === 'COMMUNITY_ADMIN')
        ? body.role as UserRole
        : UserRole.RESIDENT

      if (existingUser) {
        // Update name/phone and promote globalRole if assigning a privileged role
        await fastify.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName:  body.firstName,
            lastName:   body.lastName,
            phone:      body.phone ?? existingUser.phone,
            isActive:   true,
            globalRole: targetGlobalRole,
          },
        })
        userId = existingUser.id
      } else {
        // Create new user — track whether password was auto-generated
        const autoGenerated = !body.password
        const password = body.password ?? randomBytes(8).toString('hex')
        const passwordHash = await bcrypt.hash(password, 12)

        const newUser = await fastify.prisma.user.create({
          data: {
            email:        body.email,
            firstName:    body.firstName,
            lastName:     body.lastName,
            phone:        body.phone ?? null,
            passwordHash,
            globalRole:   targetGlobalRole,
            isVerified:   true,
          },
        })
        userId = newUser.id
        // Expose temp password so the admin can share it with the resident
        if (autoGenerated) {
          (req as any)._tempPassword = password
        }
      }

      // Upsert CommunityUser — reactivates a previously deleted membership
      const existingMembership = await fastify.prisma.communityUser.findUnique({
        where: { userId_communityId: { userId, communityId } },
      })

      if (existingMembership?.isActive) {
        // Truly already an active member — block duplicate
        return reply.code(409).send({ error: 'Conflict', message: 'Este residente ya tiene una membresía activa en la comunidad' })
      }

      let communityUser: { id: string }

      if (existingMembership) {
        // Reactivate the old (deactivated) membership
        communityUser = await fastify.prisma.communityUser.update({
          where: { id: existingMembership.id },
          data: {
            isActive:                 true,
            role:                     body.role as UserRole,
            emergencyContactName:     body.emergencyContactName ?? null,
            emergencyContactPhone:    body.emergencyContactPhone ?? null,
            emergencyContactRelation: body.emergencyContactRelation ?? null,
          },
        })
      } else {
        // Brand new membership
        communityUser = await fastify.prisma.communityUser.create({
          data: {
            userId,
            communityId,
            role:                     body.role as UserRole,
            isActive:                 true,
            emergencyContactName:     body.emergencyContactName ?? null,
            emergencyContactPhone:    body.emergencyContactPhone ?? null,
            emergencyContactRelation: body.emergencyContactRelation ?? null,
          },
        })
      }

      // Assign to unit if provided
      if (body.unitId) {
        // Close any lingering open residency for this communityUser in other units
        await fastify.prisma.unitResident.updateMany({
          where: { communityUserId: communityUser.id, moveOutDate: null },
          data:  { moveOutDate: new Date() },
        })

        // Create fresh UnitResident row (allows reusing a unit after prior resident was deleted)
        await fastify.prisma.unitResident.create({
          data: {
            unitId:          body.unitId,
            communityUserId: communityUser.id,
            isPrimary:       body.isPrimary,
            occupancyType:   body.occupancyType as any,
            moveInDate:      body.moveInDate ? new Date(body.moveInDate) : null,
          },
        })

        await fastify.prisma.unit.update({
          where: { id: body.unitId },
          data:  { isOccupied: true },
        })
      }

      return reply.code(201).send({
        ok: true,
        userId,
        communityUserId: communityUser.id,
        tempPassword: (req as any)._tempPassword ?? null,
      })
    },
  )

  // ── GET resident detail ────────────────────────────────────
  fastify.get<{ Params: { communityId: string; userId: string } }>(
    '/:communityId/residents/:userId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { communityId, userId } = req.params
      const requesterId = req.user.sub
      // Check both communityRole and globalRole so SUPER_ADMIN always passes
      const isRequesterAdmin = isAdminRole(req.user.communityRole) || isAdminRole(req.user.role)

      if (!isRequesterAdmin && requesterId !== userId) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const communityUser = await fastify.prisma.communityUser.findUnique({
        where: { userId_communityId: { userId, communityId } },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              phone: true, avatarUrl: true, createdAt: true, lastLoginAt: true,
            },
          },
          unitResidents: {
            where: { moveOutDate: null },
            include: {
              unit: {
                include: {
                  householdMembers: { where: { isActive: true }, orderBy: { name: 'asc' } },
                  vehicles:         { where: { isActive: true }, orderBy: { plateNumber: 'asc' } },
                },
              },
            },
          },
        },
      })

      if (!communityUser) {
        const err = new Error('Resident not found') as any; err.statusCode = 404; throw err
      }

      const payments = await fastify.prisma.payment.findMany({
        where: { communityId, userId, createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
        orderBy: { dueDate: 'desc' },
        take: 24,
        select: {
          id: true, amount: true, status: true, description: true,
          dueDate: true, paidAt: true, periodMonth: true, periodYear: true,
          paymentMethod: true, lateFeeApplied: true, transferProofUrl: true,
        },
      })

      return reply.send({
        id:              communityUser.userId,
        communityUserId: communityUser.id,
        role:            communityUser.role,
        phone:           communityUser.phone,
        emergencyContactName:     communityUser.emergencyContactName,
        emergencyContactPhone:    communityUser.emergencyContactPhone,
        emergencyContactRelation: communityUser.emergencyContactRelation,
        joinedAt: communityUser.joinedAt,
        user:     communityUser.user,
        units: communityUser.unitResidents.map((ur) => ({
          id:            ur.unit.id,
          number:        ur.unit.number,
          block:         ur.unit.block,
          floor:         ur.unit.floor,
          type:          ur.unit.type,
          sqMeters:      ur.unit.sqMeters,
          parkingSpots:  ur.unit.parkingSpots,
          isOccupied:    ur.unit.isOccupied,
          notes:         ur.unit.notes,
          ownerName:     ur.unit.ownerName,
          ownerPhone:    ur.unit.ownerPhone,
          ownerEmail:    ur.unit.ownerEmail,
          emergencyContactName:     ur.unit.emergencyContactName,
          emergencyContactPhone:    ur.unit.emergencyContactPhone,
          emergencyContactRelation: ur.unit.emergencyContactRelation,
          occupancyType: ur.occupancyType,
          isPrimary:     ur.isPrimary,
          moveInDate:    ur.moveInDate,
          householdMembers: ur.unit.householdMembers,
          vehicles:         ur.unit.vehicles,
        })),
        payments,
      })
    },
  )

  // ── UPDATE resident ────────────────────────────────────────
  fastify.patch<{ Params: { communityId: string; userId: string }; Body: unknown }>(
    '/:communityId/residents/:userId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, userId } = req.params
      const body = updateResidentSchema.parse(req.body)

      const userUpdates: any = {}
      if (body.firstName !== undefined) userUpdates.firstName = body.firstName
      if (body.lastName  !== undefined) userUpdates.lastName  = body.lastName
      if (body.phone     !== undefined) userUpdates.phone     = body.phone
      if (body.email !== undefined) {
        // Check email uniqueness before updating
        const existing = await fastify.prisma.user.findUnique({ where: { email: body.email } })
        if (existing && existing.id !== userId) {
          return reply.code(409).send({ error: 'Conflict', message: 'Este correo ya está en uso por otra cuenta' })
        }
        userUpdates.email = body.email
      }
      if (Object.keys(userUpdates).length > 0) {
        await fastify.prisma.user.update({ where: { id: userId }, data: userUpdates })
      }

      const cuUpdates: any = {}
      if (body.emergencyContactName     !== undefined) cuUpdates.emergencyContactName     = body.emergencyContactName
      if (body.emergencyContactPhone    !== undefined) cuUpdates.emergencyContactPhone    = body.emergencyContactPhone
      if (body.emergencyContactRelation !== undefined) cuUpdates.emergencyContactRelation = body.emergencyContactRelation

      await fastify.prisma.communityUser.update({
        where: { userId_communityId: { userId, communityId } },
        data: cuUpdates,
      })

      const unitResident = await fastify.prisma.unitResident.findFirst({
        where: { communityUser: { userId, communityId }, moveOutDate: null },
      })

      if (unitResident) {
        if (body.occupancyType !== undefined) {
          await fastify.prisma.unitResident.update({
            where: { id: unitResident.id },
            data: { occupancyType: body.occupancyType },
          })
        }

        const unitUpdates: any = {}
        if (body.ownerName  !== undefined) unitUpdates.ownerName  = body.ownerName
        if (body.ownerPhone !== undefined) unitUpdates.ownerPhone = body.ownerPhone
        if (body.ownerEmail !== undefined) unitUpdates.ownerEmail = body.ownerEmail
        if (body.unitEmergencyContactName     !== undefined) unitUpdates.emergencyContactName     = body.unitEmergencyContactName
        if (body.unitEmergencyContactPhone    !== undefined) unitUpdates.emergencyContactPhone    = body.unitEmergencyContactPhone
        if (body.unitEmergencyContactRelation !== undefined) unitUpdates.emergencyContactRelation = body.unitEmergencyContactRelation
        if (body.unitNotes !== undefined) unitUpdates.notes = body.unitNotes

        if (Object.keys(unitUpdates).length > 0) {
          await fastify.prisma.unit.update({ where: { id: unitResident.unitId }, data: unitUpdates })
        }
      }

      return reply.send({ ok: true })
    },
  )

  // ── DELETE (deactivate) resident ───────────────────────────
  fastify.delete<{ Params: { communityId: string; userId: string } }>(
    '/:communityId/residents/:userId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, userId } = req.params

      // Prevent self-deletion
      if (req.user.sub === userId) {
        return reply.code(400).send({ error: 'BadRequest', message: 'No puedes eliminar tu propia cuenta' })
      }

      // Deactivate community membership
      await fastify.prisma.communityUser.updateMany({
        where: { userId, communityId },
        data: { isActive: false },
      })

      // Set moveOutDate on all active unit residencies
      await fastify.prisma.unitResident.updateMany({
        where: { communityUser: { userId, communityId }, moveOutDate: null },
        data: { moveOutDate: new Date() },
      })

      // Check if unit still has active residents; if not, mark as vacant
      const unitResidents = await fastify.prisma.unitResident.findMany({
        where: { communityUser: { userId, communityId } },
        select: { unitId: true },
      })
      for (const { unitId } of unitResidents) {
        const remaining = await fastify.prisma.unitResident.count({
          where: { unitId, moveOutDate: null, communityUser: { isActive: true } },
        })
        if (remaining === 0) {
          await fastify.prisma.unit.update({ where: { id: unitId }, data: { isOccupied: false } })
        }
      }

      return reply.send({ ok: true, message: 'Residente dado de baja correctamente' })
    },
  )

  // ══════════════════════════════════════════════════════════
  // HOUSEHOLD MEMBERS
  // ══════════════════════════════════════════════════════════

  fastify.post<{ Params: { communityId: string; unitId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/members',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, unitId } = req.params
      const body = memberSchema.parse(req.body)
      const member = await fastify.prisma.householdMember.create({ data: { ...body, communityId, unitId } })
      return reply.code(201).send(member)
    },
  )

  fastify.patch<{ Params: { communityId: string; unitId: string; memberId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/members/:memberId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, unitId, memberId } = req.params
      const body = memberSchema.partial().parse(req.body)
      const res = await fastify.prisma.householdMember.updateMany({ where: { id: memberId, unitId, communityId }, data: body })
      if (res.count === 0) { const err = new Error('Member not found') as any; err.statusCode = 404; throw err }
      return reply.send({ ok: true })
    },
  )

  fastify.delete<{ Params: { communityId: string; unitId: string; memberId: string } }>(
    '/:communityId/units/:unitId/members/:memberId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, unitId, memberId } = req.params
      await fastify.prisma.householdMember.updateMany({ where: { id: memberId, unitId, communityId }, data: { isActive: false } })
      return reply.send({ ok: true })
    },
  )

  // ══════════════════════════════════════════════════════════
  // VEHICLES
  // ══════════════════════════════════════════════════════════

  fastify.post<{ Params: { communityId: string; unitId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/vehicles',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, unitId } = req.params
      const body = vehicleSchema.parse(req.body)
      const vehicle = await fastify.prisma.vehicle.create({ data: { ...body, communityId, unitId } })
      return reply.code(201).send(vehicle)
    },
  )

  fastify.patch<{ Params: { communityId: string; unitId: string; vehicleId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/vehicles/:vehicleId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, unitId, vehicleId } = req.params
      const body = vehicleSchema.partial().parse(req.body)
      const res = await fastify.prisma.vehicle.updateMany({ where: { id: vehicleId, unitId, communityId }, data: body })
      if (res.count === 0) { const err = new Error('Vehicle not found') as any; err.statusCode = 404; throw err }
      return reply.send({ ok: true })
    },
  )

  fastify.delete<{ Params: { communityId: string; unitId: string; vehicleId: string } }>(
    '/:communityId/units/:unitId/vehicles/:vehicleId',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, unitId, vehicleId } = req.params
      await fastify.prisma.vehicle.updateMany({ where: { id: vehicleId, unitId, communityId }, data: { isActive: false } })
      return reply.send({ ok: true })
    },
  )

  // ══════════════════════════════════════════════════════════
  // PAYMENTS — cash mark-paid + transfer proof upload
  // ══════════════════════════════════════════════════════════

  // ── Mark paid (cash / transfer / check) ────────────────────
  fastify.patch<{ Params: { communityId: string; paymentId: string }; Body: unknown }>(
    '/:communityId/payments/:paymentId/mark-paid',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, paymentId } = req.params
      const body = markPaidSchema.parse(req.body)

      const payment = await fastify.prisma.payment.findFirst({ where: { id: paymentId, communityId } })
      if (!payment) { const err = new Error('Payment not found') as any; err.statusCode = 404; throw err }
      if (payment.status === 'COMPLETED') { const err = new Error('Payment is already marked as paid') as any; err.statusCode = 400; throw err }

      await fastify.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status:           'COMPLETED',
          paymentMethod:    body.paymentMethod,
          cashReceivedById: req.user.sub,
          cashNotes:        body.cashNotes ?? null,
          transferProofUrl: body.transferProofUrl ?? null,
          paidAt:           new Date(),
          ...(body.amount !== undefined ? { amount: body.amount } : {}),
        },
      })

      return reply.send({ ok: true, message: 'Pago registrado como recibido' })
    },
  )

  // ── Upload transfer proof screenshot ───────────────────────
  fastify.post<{ Params: { communityId: string; paymentId: string } }>(
    '/:communityId/payments/:paymentId/upload-proof',
    { preHandler: [fastify.authenticate, fastify.requireRole(...ADMIN_ROLES)] },
    async (req, reply) => {
      const { communityId, paymentId } = req.params

      const payment = await fastify.prisma.payment.findFirst({ where: { id: paymentId, communityId } })
      if (!payment) { const err = new Error('Payment not found') as any; err.statusCode = 404; throw err }

      const data = await req.file()
      if (!data) {
        return reply.code(400).send({ error: 'BadRequest', message: 'No se recibió ningún archivo' })
      }

      const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
      if (!allowedMime.includes(data.mimetype)) {
        return reply.code(400).send({ error: 'BadRequest', message: 'Solo se aceptan imágenes (JPG, PNG, WEBP)' })
      }

      // ── Try R2 upload if configured, otherwise store as base64 ──
      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      let proofUrl: string

      const { env } = await import('../../config/env.js')
      if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_ACCOUNT_ID) {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId:     env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        })
        const ext = data.mimetype.split('/')[1] ?? 'jpg'
        const key = `transfer-proofs/${communityId}/${paymentId}-${Date.now()}.${ext}`
        await s3.send(new PutObjectCommand({
          Bucket:      env.R2_BUCKET_NAME,
          Key:         key,
          Body:        buffer,
          ContentType: data.mimetype,
        }))
        proofUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `https://${env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`
      } else {
        // Fallback: base64 data URL (stored in DB — works without R2)
        proofUrl = `data:${data.mimetype};base64,${buffer.toString('base64')}`
      }

      await fastify.prisma.payment.update({
        where: { id: paymentId },
        data: { transferProofUrl: proofUrl },
      })

      return reply.send({ ok: true, url: proofUrl })
    },
  )
}

export default residentRoutes

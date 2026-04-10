import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// ============================================================
// Resident Management Routes (admin)
//
// GET    /:communityId/residents                         — list all residents
// GET    /:communityId/residents/:userId                 — resident detail
// PATCH  /:communityId/residents/:userId                 — update resident info
//
// POST   /:communityId/units/:unitId/members             — add household member
// PATCH  /:communityId/units/:unitId/members/:memberId   — update member
// DELETE /:communityId/units/:unitId/members/:memberId   — remove member
//
// POST   /:communityId/units/:unitId/vehicles            — add vehicle
// PATCH  /:communityId/units/:unitId/vehicles/:vehicleId — update vehicle
// DELETE /:communityId/units/:unitId/vehicles/:vehicleId — remove vehicle
//
// PATCH  /:communityId/payments/:paymentId/mark-paid     — cash payment (admin)
// ============================================================

const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN]

function isAdmin(role?: string | null) {
  return ADMIN_ROLES.includes(role as UserRole)
}

// ── Validation schemas ─────────────────────────────────────────

const updateResidentSchema = z.object({
  firstName:                z.string().min(1).optional(),
  lastName:                 z.string().min(1).optional(),
  phone:                    z.string().optional().nullable(),
  emergencyContactName:     z.string().optional().nullable(),
  emergencyContactPhone:    z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
  // Unit-level fields
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
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']).default('CASH'),
  cashNotes:     z.string().optional().nullable(),
  amount:        z.number().positive().optional(), // override amount if needed
})

// ── Plugin ────────────────────────────────────────────────────

const residentRoutes: FastifyPluginAsync = async (fastify) => {

  // ── LIST residents ─────────────────────────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { search?: string; block?: string; page?: string; limit?: string }
  }>(
    '/:communityId/residents',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId } = req.params
      const { search, block } = req.query
      const page  = parseInt(req.query.page  ?? '1')
      const limit = parseInt(req.query.limit ?? '50')
      const skip  = (page - 1) * limit

      const where: any = {
        communityId,
        role: { in: [UserRole.RESIDENT, UserRole.COMMUNITY_ADMIN] },
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

      // Filter by block if requested
      let results = communityUsers
      if (block) {
        results = communityUsers.filter((cu) =>
          cu.unitResidents.some((ur) => ur.unit.block === block),
        )
      }

      // Attach pending payment count per resident
      const userIds = results.map((cu) => cu.userId)
      const pendingPayments = await fastify.prisma.payment.groupBy({
        by: ['userId'],
        where: { communityId, userId: { in: userIds }, status: 'PENDING' },
        _count: { id: true },
        _sum: { amount: true },
      })
      const pendingMap = new Map(pendingPayments.map((p) => [p.userId, p]))

      const residents = results.map((cu) => ({
        id:         cu.userId,
        communityUserId: cu.id,
        role:       cu.role,
        phone:      cu.phone,
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

  // ── GET resident detail ────────────────────────────────────
  fastify.get<{ Params: { communityId: string; userId: string } }>(
    '/:communityId/residents/:userId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { communityId, userId } = req.params
      const requesterId = req.user.sub
      const requesterRole = req.user.communityRole ?? req.user.role

      // Residents can only view themselves; admins can view anyone
      if (!isAdmin(requesterRole) && requesterId !== userId) {
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
                  householdMembers: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' },
                  },
                  vehicles: {
                    where: { isActive: true },
                    orderBy: { plateNumber: 'asc' },
                  },
                },
              },
            },
          },
        },
      })

      if (!communityUser) {
        const err = new Error('Resident not found') as any
        err.statusCode = 404
        throw err
      }

      // Payments summary (last 12 months)
      const payments = await fastify.prisma.payment.findMany({
        where: {
          communityId,
          userId,
          createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { dueDate: 'desc' },
        take: 24,
        select: {
          id: true, amount: true, status: true, description: true,
          dueDate: true, paidAt: true, periodMonth: true, periodYear: true,
          paymentMethod: true, lateFeeApplied: true,
        },
      })

      return reply.send({
        id:         communityUser.userId,
        communityUserId: communityUser.id,
        role:       communityUser.role,
        phone:      communityUser.phone,
        emergencyContactName:     communityUser.emergencyContactName,
        emergencyContactPhone:    communityUser.emergencyContactPhone,
        emergencyContactRelation: communityUser.emergencyContactRelation,
        joinedAt:   communityUser.joinedAt,
        user:       communityUser.user,
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
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, userId } = req.params
      const body = updateResidentSchema.parse(req.body)

      // Update user name/phone
      const userUpdates: any = {}
      if (body.firstName !== undefined) userUpdates.firstName = body.firstName
      if (body.lastName  !== undefined) userUpdates.lastName  = body.lastName
      if (body.phone     !== undefined) userUpdates.phone     = body.phone

      if (Object.keys(userUpdates).length > 0) {
        await fastify.prisma.user.update({ where: { id: userId }, data: userUpdates })
      }

      // Update community-scoped contact info
      const cuUpdates: any = {}
      if (body.emergencyContactName     !== undefined) cuUpdates.emergencyContactName     = body.emergencyContactName
      if (body.emergencyContactPhone    !== undefined) cuUpdates.emergencyContactPhone    = body.emergencyContactPhone
      if (body.emergencyContactRelation !== undefined) cuUpdates.emergencyContactRelation = body.emergencyContactRelation

      const communityUser = await fastify.prisma.communityUser.update({
        where: { userId_communityId: { userId, communityId } },
        data: cuUpdates,
      })

      // Update unit and unit resident if fields supplied
      const unitResident = await fastify.prisma.unitResident.findFirst({
        where: { communityUser: { userId, communityId }, moveOutDate: null },
      })

      if (unitResident) {
        // Update UnitResident occupancy type
        if (body.occupancyType !== undefined) {
          await fastify.prisma.unitResident.update({
            where: { id: unitResident.id },
            data: { occupancyType: body.occupancyType },
          })
        }

        // Update Unit-level fields
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

  // ══════════════════════════════════════════════════════════
  // HOUSEHOLD MEMBERS
  // ══════════════════════════════════════════════════════════

  // ── ADD member ─────────────────────────────────────────────
  fastify.post<{ Params: { communityId: string; unitId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/members',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, unitId } = req.params
      const body = memberSchema.parse(req.body)

      const member = await fastify.prisma.householdMember.create({
        data: { ...body, communityId, unitId },
      })
      return reply.code(201).send(member)
    },
  )

  // ── UPDATE member ──────────────────────────────────────────
  fastify.patch<{ Params: { communityId: string; unitId: string; memberId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/members/:memberId',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, unitId, memberId } = req.params
      const body = memberSchema.partial().parse(req.body)

      const member = await fastify.prisma.householdMember.updateMany({
        where: { id: memberId, unitId, communityId },
        data: body,
      })
      if (member.count === 0) {
        const err = new Error('Member not found') as any; err.statusCode = 404; throw err
      }
      return reply.send({ ok: true })
    },
  )

  // ── DELETE (deactivate) member ─────────────────────────────
  fastify.delete<{ Params: { communityId: string; unitId: string; memberId: string } }>(
    '/:communityId/units/:unitId/members/:memberId',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, unitId, memberId } = req.params
      await fastify.prisma.householdMember.updateMany({
        where: { id: memberId, unitId, communityId },
        data: { isActive: false },
      })
      return reply.send({ ok: true })
    },
  )

  // ══════════════════════════════════════════════════════════
  // VEHICLES
  // ══════════════════════════════════════════════════════════

  // ── ADD vehicle ────────────────────────────────────────────
  fastify.post<{ Params: { communityId: string; unitId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/vehicles',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, unitId } = req.params
      const body = vehicleSchema.parse(req.body)

      const vehicle = await fastify.prisma.vehicle.create({
        data: { ...body, communityId, unitId },
      })
      return reply.code(201).send(vehicle)
    },
  )

  // ── UPDATE vehicle ─────────────────────────────────────────
  fastify.patch<{ Params: { communityId: string; unitId: string; vehicleId: string }; Body: unknown }>(
    '/:communityId/units/:unitId/vehicles/:vehicleId',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, unitId, vehicleId } = req.params
      const body = vehicleSchema.partial().parse(req.body)

      const vehicle = await fastify.prisma.vehicle.updateMany({
        where: { id: vehicleId, unitId, communityId },
        data: body,
      })
      if (vehicle.count === 0) {
        const err = new Error('Vehicle not found') as any; err.statusCode = 404; throw err
      }
      return reply.send({ ok: true })
    },
  )

  // ── DELETE (deactivate) vehicle ────────────────────────────
  fastify.delete<{ Params: { communityId: string; unitId: string; vehicleId: string } }>(
    '/:communityId/units/:unitId/vehicles/:vehicleId',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, unitId, vehicleId } = req.params
      await fastify.prisma.vehicle.updateMany({
        where: { id: vehicleId, unitId, communityId },
        data: { isActive: false },
      })
      return reply.send({ ok: true })
    },
  )

  // ══════════════════════════════════════════════════════════
  // CASH PAYMENT — admin marks a payment as received manually
  // ══════════════════════════════════════════════════════════

  fastify.patch<{ Params: { communityId: string; paymentId: string }; Body: unknown }>(
    '/:communityId/payments/:paymentId/mark-paid',
    { preHandler: [fastify.authenticate, fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)] },
    async (req, reply) => {
      const { communityId, paymentId } = req.params
      const body = markPaidSchema.parse(req.body)

      const payment = await fastify.prisma.payment.findFirst({
        where: { id: paymentId, communityId },
      })

      if (!payment) {
        const err = new Error('Payment not found') as any; err.statusCode = 404; throw err
      }
      if (payment.status === 'COMPLETED') {
        const err = new Error('Payment is already marked as paid') as any; err.statusCode = 400; throw err
      }

      await fastify.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status:          'COMPLETED',
          paymentMethod:   body.paymentMethod,
          cashReceivedById: req.user.sub,
          cashNotes:       body.cashNotes ?? null,
          paidAt:          new Date(),
          ...(body.amount !== undefined
            ? { amount: body.amount }
            : {}),
        },
      })

      return reply.send({ ok: true, message: 'Pago registrado como recibido' })
    },
  )
}

export default residentRoutes

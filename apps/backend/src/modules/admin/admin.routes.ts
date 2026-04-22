import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { getDashboardStats, getPaymentReport, getAccessReport } from './admin.service.js'
import { sendPushNotification } from '../notifications/notification.service.js'

// ── CSV helper ────────────────────────────────────────────────
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h] ?? ''
        const s = String(v).replace(/"/g, '""')
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
      }).join(',')
    ),
  ]
  return lines.join('\r\n')
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = [
    fastify.authenticate,
    fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
  ]

  // GET /communities/:id/admin/stats — dashboard overview
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/admin/stats',
    { preHandler: adminOnly },
    async (req, reply) => {
      const stats = await getDashboardStats(fastify.prisma, req.params.communityId)
      return reply.send(stats)
    },
  )

  // GET /communities/:id/admin/reports/payments — monthly payment chart
  fastify.get<{ Params: { communityId: string }; Querystring: { months?: string } }>(
    '/:communityId/admin/reports/payments',
    { preHandler: adminOnly },
    async (req, reply) => {
      const months = req.query.months ? parseInt(req.query.months) : 6
      const data = await getPaymentReport(fastify.prisma, req.params.communityId, months)
      return reply.send(data)
    },
  )

  // GET /communities/:id/admin/reports/access — daily access events
  fastify.get<{ Params: { communityId: string }; Querystring: { days?: string } }>(
    '/:communityId/admin/reports/access',
    { preHandler: adminOnly },
    async (req, reply) => {
      const days = req.query.days ? parseInt(req.query.days) : 7
      const data = await getAccessReport(fastify.prisma, req.params.communityId, days)
      return reply.send(data)
    },
  )

  // GET /communities/:id/admin/arrears — units with outstanding balances
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/admin/arrears',
    { preHandler: adminOnly },
    async (req, reply) => {
      const now = new Date()

      // All PENDING payments for this community, grouped by unit
      const pending = await fastify.prisma.payment.findMany({
        where: { communityId: req.params.communityId, status: 'PENDING' },
        include: {
          unit:  { select: { id: true, number: true, block: true, floor: true } },
          user:  { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
        orderBy: { dueDate: 'asc' },
      })

      // Group by unitId
      const byUnit = new Map<string, {
        unit: { id: string; number: string; block: string | null; floor: number | null }
        resident: { firstName: string; lastName: string; email: string; phone: string | null } | null
        payments: typeof pending
        totalDebt: number
        oldestDueDate: Date
        monthsOverdue: number
      }>()

      for (const p of pending) {
        const key = p.unitId
        if (!byUnit.has(key)) {
          byUnit.set(key, {
            unit: p.unit,
            resident: p.user ? { firstName: p.user.firstName, lastName: p.user.lastName, email: p.user.email, phone: p.user.phone } : null,
            payments: [],
            totalDebt: 0,
            oldestDueDate: p.dueDate ?? now,
            monthsOverdue: 0,
          })
        }
        const entry = byUnit.get(key)!
        entry.payments.push(p)
        entry.totalDebt += Number(p.amount)
        if (p.dueDate && p.dueDate < entry.oldestDueDate) {
          entry.oldestDueDate = p.dueDate
        }
      }

      // Calculate months overdue from oldest due date
      const result = Array.from(byUnit.values()).map((e) => {
        const diffMs = now.getTime() - e.oldestDueDate.getTime()
        const monthsOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)))
        return {
          unitId:       e.unit.id,
          unitNumber:   e.unit.number,
          block:        e.unit.block,
          floor:        e.unit.floor,
          resident:     e.resident,
          totalDebt:    e.totalDebt,
          pendingCount: e.payments.length,
          monthsOverdue,
          oldestDueDate: e.oldestDueDate,
          payments: e.payments.map((p) => ({
            id: p.id, amount: Number(p.amount), description: p.description,
            dueDate: p.dueDate, periodMonth: p.periodMonth, periodYear: p.periodYear,
          })),
        }
      }).sort((a, b) => b.totalDebt - a.totalDebt)

      return reply.send({ arrears: result, total: result.length })
    },
  )

  // ── CSV EXPORT ROUTES ─────────────────────────────────────

  type CsvParams = { Params: { communityId: string }; Querystring: { from?: string; to?: string } }

  function dateRange(from?: string, to?: string) {
    const now = new Date()
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = to   ? new Date(to)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { start, end }
  }

  const CSV_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }

  // GET /communities/:id/admin/csv/access — gate access log
  fastify.get<CsvParams>(
    '/:communityId/admin/csv/access',
    { preHandler: adminOnly, ...CSV_RATE_LIMIT },
    async (req, reply) => {
      const { communityId } = req.params
      const { start, end } = dateRange(req.query.from, req.query.to)

      const events = await fastify.prisma.accessEvent.findMany({
        where: { communityId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        include: { visitorPass: { select: { visitorName: true, visitorPhone: true } } },
      })

      const rows = events.map((e) => ({
        'Fecha/Hora': e.createdAt.toISOString(),
        'Tipo': e.type,
        'Método': e.method,
        'Persona': e.personName,
        'Tipo de persona': e.personType,
        'Placa': e.plateNumber ?? '',
        'Pase de visita': e.visitorPass?.visitorName ?? '',
        'Teléfono visita': e.visitorPass?.visitorPhone ?? '',
        'Permitido': e.isAllowed ? 'Sí' : 'No',
        'Motivo denegado': e.deniedReason ?? '',
        'Notas': e.notes ?? '',
      }))

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="accesos_${communityId}_${start.toISOString().slice(0,10)}.csv"`)
      return reply.send('\uFEFF' + toCSV(rows))
    },
  )

  // GET /communities/:id/admin/csv/payments — payments log
  fastify.get<CsvParams>(
    '/:communityId/admin/csv/payments',
    { preHandler: adminOnly, ...CSV_RATE_LIMIT },
    async (req, reply) => {
      const { communityId } = req.params
      const { start, end } = dateRange(req.query.from, req.query.to)

      const payments = await fastify.prisma.payment.findMany({
        where: { communityId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          unit:  { select: { number: true, block: true } },
        },
      })

      const rows = payments.map((p) => ({
        'Fecha': p.createdAt.toISOString().slice(0, 10),
        'Pagado el': p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '',
        'Residente': `${p.user.firstName} ${p.user.lastName}`,
        'Email': p.user.email,
        'Unidad': p.unit ? `${p.unit.block ? p.unit.block + '-' : ''}${p.unit.number}` : '',
        'Tipo': p.type,
        'Descripción': p.description,
        'Monto': Number(p.amount).toFixed(2),
        'Moneda': p.currency,
        'Estado': p.status,
        'Mes': p.periodMonth ?? '',
        'Año': p.periodYear ?? '',
      }))

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="pagos_${communityId}_${start.toISOString().slice(0,10)}.csv"`)
      return reply.send('\uFEFF' + toCSV(rows))
    },
  )

  // GET /communities/:id/admin/csv/reservations — reservations log
  fastify.get<CsvParams>(
    '/:communityId/admin/csv/reservations',
    { preHandler: adminOnly, ...CSV_RATE_LIMIT },
    async (req, reply) => {
      const { communityId } = req.params
      const { start, end } = dateRange(req.query.from, req.query.to)

      const reservations = await fastify.prisma.reservation.findMany({
        where: { communityId, createdAt: { gte: start, lte: end } },
        orderBy: { startTime: 'desc' },
        include: {
          user:       { select: { firstName: true, lastName: true, email: true } },
          commonArea: { select: { name: true } },
        },
      })

      const rows = reservations.map((r) => ({
        'Fecha creación': r.createdAt.toISOString().slice(0, 10),
        'Área': r.commonArea.name,
        'Residente': `${r.user.firstName} ${r.user.lastName}`,
        'Email': r.user.email,
        'Inicio': r.startTime.toISOString(),
        'Fin': r.endTime.toISOString(),
        'Estado': r.status,
        'Monto cobrado': Number(r.feeAmount ?? 0).toFixed(2),
        'Notas': r.notes ?? '',
      }))

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="reservaciones_${communityId}_${start.toISOString().slice(0,10)}.csv"`)
      return reply.send('\uFEFF' + toCSV(rows))
    },
  )

  // GET /communities/:id/admin/csv/visitors — visitor passes log
  fastify.get<CsvParams>(
    '/:communityId/admin/csv/visitors',
    { preHandler: adminOnly, ...CSV_RATE_LIMIT },
    async (req, reply) => {
      const { communityId } = req.params
      const { start, end } = dateRange(req.query.from, req.query.to)

      const passes = await fastify.prisma.visitorPass.findMany({
        where: { communityId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy:    { select: { firstName: true, lastName: true, email: true } },
          accessEvents: { select: { type: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
        },
      })

      const rows = passes.map((p) => ({
        'Fecha creación': p.createdAt.toISOString().slice(0, 10),
        'Creado por': `${p.createdBy.firstName} ${p.createdBy.lastName}`,
        'Email anfitrión': p.createdBy.email,
        'Visitante': p.visitorName,
        'Teléfono visitante': p.visitorPhone ?? '',
        'Placa': p.plateNumber ?? '',
        'Válido desde': p.validFrom.toISOString().slice(0, 10),
        'Válido hasta': p.validUntil.toISOString().slice(0, 10),
        'Usos máx.': p.maxUses,
        'Usos realizados': p.usedCount,
        'Estado': p.status,
        'Accesos registrados': p.accessEvents.length,
        'Último acceso': p.accessEvents[0]?.createdAt.toISOString() ?? '',
      }))

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="visitantes_${communityId}_${start.toISOString().slice(0,10)}.csv"`)
      return reply.send('\uFEFF' + toCSV(rows))
    },
  )

  // GET /communities/:id/admin/csv/summary — full summary report
  fastify.get<CsvParams>(
    '/:communityId/admin/csv/summary',
    { preHandler: adminOnly, ...CSV_RATE_LIMIT },
    async (req, reply) => {
      const { communityId } = req.params
      const { start, end } = dateRange(req.query.from, req.query.to)

      const [payments, accesses, reservations, passes] = await Promise.all([
        fastify.prisma.payment.aggregate({
          where: { communityId, status: 'COMPLETED', paidAt: { gte: start, lte: end } },
          _sum: { amount: true }, _count: true,
        }),
        fastify.prisma.accessEvent.groupBy({
          by: ['type', 'isAllowed'],
          where: { communityId, createdAt: { gte: start, lte: end } },
          _count: true,
        }),
        fastify.prisma.reservation.groupBy({
          by: ['status'],
          where: { communityId, createdAt: { gte: start, lte: end } },
          _count: true,
        }),
        fastify.prisma.visitorPass.count({ where: { communityId, createdAt: { gte: start, lte: end } } }),
      ])

      const accessMap: Record<string, number> = {}
      accesses.forEach((a) => {
        accessMap[`${a.type}_${a.isAllowed ? 'permitido' : 'denegado'}`] = a._count
      })

      const resMap: Record<string, number> = {}
      reservations.forEach((r) => { resMap[r.status] = r._count })

      const rows = [{
        'Período desde': start.toISOString().slice(0, 10),
        'Período hasta': end.toISOString().slice(0, 10),
        'Ingresos cobrados': Number(payments._sum.amount ?? 0).toFixed(2),
        'Pagos completados': payments._count,
        'Entradas permitidas': accessMap['ENTRY_permitido'] ?? 0,
        'Salidas permitidas': accessMap['EXIT_permitido'] ?? 0,
        'Accesos denegados': (accessMap['ENTRY_denegado'] ?? 0) + (accessMap['EXIT_denegado'] ?? 0),
        'Reservaciones confirmadas': resMap['CONFIRMED'] ?? 0,
        'Reservaciones pendientes': resMap['PENDING'] ?? 0,
        'Reservaciones canceladas': resMap['CANCELLED'] ?? 0,
        'Pases de visita generados': passes,
      }]

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="resumen_${communityId}_${start.toISOString().slice(0,10)}.csv"`)
      return reply.send('\uFEFF' + toCSV(rows))
    },
  )

  // ── ACCESS EVENTS LIST (paginated) ────────────────────────

  fastify.get<{
    Params: { communityId: string }
    Querystring: { page?: string; limit?: string; type?: string; from?: string; to?: string }
  }>(
    '/:communityId/admin/access-events',
    { preHandler: adminOnly },
    async (req, reply) => {
      const { communityId } = req.params
      const page  = req.query.page  ? parseInt(req.query.page)  : 1
      const limit = req.query.limit ? parseInt(req.query.limit) : 30
      const skip  = (page - 1) * limit

      const where: Record<string, unknown> = { communityId }
      if (req.query.type) where['type'] = req.query.type
      if (req.query.from || req.query.to) {
        where['createdAt'] = {
          ...(req.query.from ? { gte: new Date(req.query.from) } : {}),
          ...(req.query.to   ? { lte: new Date(req.query.to)   } : {}),
        }
      }

      const [events, total] = await Promise.all([
        fastify.prisma.accessEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            visitorPass: { select: { visitorName: true } },
          },
        }),
        fastify.prisma.accessEvent.count({ where }),
      ])

      return reply.send({ events, total, page, limit, pages: Math.ceil(total / limit) })
    },
  )

  // ── IDENTITY VERIFICATION (admin approves) ────────────────

  // POST /communities/:id/admin/seed-id — TEST DATA: simulate a resident uploading their ID
  fastify.post<{ Params: { communityId: string } }>(
    '/:communityId/admin/seed-id',
    { preHandler: adminOnly },
    async (req, reply) => {
      const { communityId } = req.params
      // Pick the first active resident that has NOT submitted yet or was rejected
      const cu = await fastify.prisma.communityUser.findFirst({
        where: {
          communityId,
          isActive: true,
          user: { idVerificationStatus: { in: ['NOT_SUBMITTED', 'REJECTED'] } },
        },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { joinedAt: 'asc' },
      })
      if (!cu) {
        return reply.code(404).send({ error: 'No hay residentes disponibles para simular una verificación. Todos ya tienen un envío pendiente o aprobado.' })
      }
      const placeholderUrl = 'https://placehold.co/800x500/dbeafe/1e40af/png?text=INE+PRUEBA'
      await fastify.prisma.user.update({
        where: { id: cu.userId },
        data: { idPhotoUrl: placeholderUrl, idVerified: false, idVerificationStatus: 'PENDING' },
      })
      return reply.send({ ok: true, userId: cu.userId })
    },
  )

  // GET /communities/:id/admin/id-pending — legacy compat: only pending
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/admin/id-pending',
    { preHandler: adminOnly },
    async (req, reply) => {
      const { communityId } = req.params
      const members = await fastify.prisma.communityUser.findMany({
        where: { communityId, isActive: true, user: { idVerificationStatus: 'PENDING' } },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, idPhotoUrl: true, idVerificationStatus: true } } },
      })
      return reply.send({ pending: members.map((m) => m.user) })
    },
  )

  // GET /communities/:id/admin/id-verifications?status=PENDING|APPROVED|REJECTED|ALL
  fastify.get<{ Params: { communityId: string }; Querystring: { status?: string } }>(
    '/:communityId/admin/id-verifications',
    { preHandler: adminOnly },
    async (req, reply) => {
      const { communityId } = req.params
      const status = req.query.status ?? 'ALL'

      // Build filter — exclude NOT_SUBMITTED unless explicitly requested
      const statusFilter = status === 'ALL'
        ? { not: 'NOT_SUBMITTED' }
        : status

      const members = await fastify.prisma.communityUser.findMany({
        where: {
          communityId,
          isActive: true,
          user: { idVerificationStatus: statusFilter as any },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              idPhotoUrl: true,
              idVerified: true,
              idVerificationStatus: true,
              idVerificationNote: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { user: { updatedAt: 'desc' } },
      })

      return reply.send({ verifications: members.map((m) => m.user) })
    },
  )

  const idVerifySchema = z.object({
    approve: z.boolean(),
    note: z.string().max(500).optional(),
  })

  // PATCH /communities/:id/admin/id-verify/:userId — approve or reject ID + notify user
  fastify.patch<{
    Params: { communityId: string; userId: string }
    Body: unknown
  }>(
    '/:communityId/admin/id-verify/:userId',
    { preHandler: adminOnly },
    async (req, reply) => {
      const { userId, communityId } = req.params
      const { approve, note } = idVerifySchema.parse(req.body)

      const newStatus = approve ? 'APPROVED' : 'REJECTED'

      await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          idVerified: approve,
          idVerificationStatus: newStatus,
          idVerificationNote: note ?? null,
          // On reject: keep the photo so admin can still see it in history
          // User must re-upload to get back to PENDING
        },
      })

      // Push notification to the resident
      sendPushNotification(fastify.prisma, {
        userIds: [userId],
        title: approve ? '✅ Identidad verificada' : '❌ Verificación rechazada',
        body: approve
          ? 'Tu identidad fue verificada correctamente. Ya tienes acceso completo.'
          : note
            ? `Tu verificación fue rechazada: ${note}. Sube una nueva foto para reintentar.`
            : 'Tu verificación fue rechazada. Sube una nueva foto para reintentar.',
        type: 'id_verification',
        data: { status: newStatus, communityId },
      }).catch(() => {})

      return reply.send({ ok: true, status: newStatus })
    },
  )
}

export default adminRoutes

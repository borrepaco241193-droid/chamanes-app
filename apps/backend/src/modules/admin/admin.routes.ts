import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { getDashboardStats, getPaymentReport, getAccessReport } from './admin.service.js'

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

  // ── CSV EXPORT ROUTES ─────────────────────────────────────

  type CsvParams = { Params: { communityId: string }; Querystring: { from?: string; to?: string } }

  function dateRange(from?: string, to?: string) {
    const now = new Date()
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = to   ? new Date(to)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { start, end }
  }

  // GET /communities/:id/admin/csv/access — gate access log
  fastify.get<CsvParams>(
    '/:communityId/admin/csv/access',
    { preHandler: adminOnly },
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
    { preHandler: adminOnly },
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
    { preHandler: adminOnly },
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
    { preHandler: adminOnly },
    async (req, reply) => {
      const { communityId } = req.params
      const { start, end } = dateRange(req.query.from, req.query.to)

      const passes = await fastify.prisma.visitorPass.findMany({
        where: { communityId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          accessEvents: { select: { type: true, createdAt: true } },
        },
      })

      const rows = passes.map((p) => ({
        'Fecha creación': p.createdAt.toISOString().slice(0, 10),
        'Creado por': `${p.user.firstName} ${p.user.lastName}`,
        'Email anfitrión': p.user.email,
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
    { preHandler: adminOnly },
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

  // ── IDENTITY VERIFICATION (admin approves) ────────────────

  // GET /communities/:id/admin/id-pending — users with idPhotoUrl but not idVerified
  fastify.get<{ Params: { communityId: string } }>(
    '/:communityId/admin/id-pending',
    { preHandler: adminOnly },
    async (req, reply) => {
      const { communityId } = req.params
      const members = await fastify.prisma.communityUser.findMany({
        where: { communityId, isActive: true, user: { idPhotoUrl: { not: null }, idVerified: false } },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, idPhotoUrl: true } } },
      })
      return reply.send({ pending: members.map((m) => m.user) })
    },
  )

  // PATCH /communities/:id/admin/id-verify/:userId — approve or reject ID
  fastify.patch<{ Params: { communityId: string; userId: string }; Body: { approve: boolean } }>(
    '/:communityId/admin/id-verify/:userId',
    { preHandler: adminOnly },
    async (req, reply) => {
      const { userId } = req.params
      const { approve } = req.body as { approve: boolean }
      await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          idVerified: approve,
          ...(approve ? {} : { idPhotoUrl: null }), // reject = clear photo so they can re-upload
        },
      })
      return reply.send({ ok: true })
    },
  )
}

export default adminRoutes

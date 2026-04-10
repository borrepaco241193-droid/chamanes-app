import { PrismaClient, PaymentStatus, VisitorPassStatus, WorkOrderStatus, ReservationStatus } from '@prisma/client'
import { startOfMonth, endOfMonth, startOfDay, subMonths, format } from 'date-fns'

// ============================================================
// Admin Service — dashboard stats + reports
// ============================================================

export async function getDashboardStats(prisma: PrismaClient, communityId: string) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const todayStart = startOfDay(now)

  const [
    totalUnits,
    occupiedUnits,
    totalResidents,
    pendingPayments,
    collectedThisMonth,
    activeVisitorPasses,
    todayAccessEvents,
    openWorkOrders,
    urgentWorkOrders,
    pendingReservations,
    upcomingReservations,
    staffOnDuty,
  ] = await Promise.all([
    prisma.unit.count({ where: { communityId } }),
    prisma.unit.count({ where: { communityId, isOccupied: true } }),
    prisma.communityUser.count({ where: { communityId, isActive: true, role: 'RESIDENT' } }),
    prisma.payment.count({ where: { communityId, status: PaymentStatus.PENDING } }),
    prisma.payment.aggregate({
      where: { communityId, status: PaymentStatus.COMPLETED, paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.visitorPass.count({ where: { communityId, status: VisitorPassStatus.ACTIVE } }),
    prisma.accessEvent.count({ where: { communityId, createdAt: { gte: todayStart } } }),
    prisma.workOrder.count({ where: { communityId, status: { in: [WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS] } } }),
    prisma.workOrder.count({ where: { communityId, priority: 'URGENT', status: { not: WorkOrderStatus.COMPLETED } } }),
    prisma.reservation.count({ where: { communityId, status: ReservationStatus.PENDING } }),
    prisma.reservation.count({ where: { communityId, status: ReservationStatus.CONFIRMED, startTime: { gte: now } } }),
    prisma.staffCheckIn.count({ where: { staff: { communityId }, checkOutTime: null } }),
  ])

  return {
    units: { total: totalUnits, occupied: occupiedUnits, vacant: totalUnits - occupiedUnits },
    residents: totalResidents,
    payments: {
      pending: pendingPayments,
      collectedThisMonth: Number(collectedThisMonth._sum.amount ?? 0),
    },
    visitors: {
      activePasses: activeVisitorPasses,
      todayEvents: todayAccessEvents,
    },
    workOrders: {
      open: openWorkOrders,
      urgent: urgentWorkOrders,
    },
    reservations: {
      pending: pendingReservations,
      upcoming: upcomingReservations,
    },
    staff: {
      onDuty: staffOnDuty,
    },
  }
}

export async function getPaymentReport(
  prisma: PrismaClient,
  communityId: string,
  months = 6,
) {
  const now = new Date()
  const data = []

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const start = startOfMonth(date)
    const end = endOfMonth(date)

    const [collected, pending, total] = await Promise.all([
      prisma.payment.aggregate({
        where: { communityId, status: PaymentStatus.COMPLETED, paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.count({
        where: { communityId, status: PaymentStatus.PENDING, dueDate: { gte: start, lte: end } },
      }),
      prisma.payment.count({
        where: { communityId, createdAt: { gte: start, lte: end } },
      }),
    ])

    data.push({
      month: format(date, 'MMM yyyy'),
      collected: Number(collected._sum.amount ?? 0),
      paidCount: collected._count,
      pendingCount: pending,
      totalCount: total,
    })
  }

  return data
}

export async function getAccessReport(prisma: PrismaClient, communityId: string, days = 7) {
  const now = new Date()
  const data = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const start = startOfDay(date)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)

    const [entries, exits, denied] = await Promise.all([
      prisma.accessEvent.count({ where: { communityId, type: 'ENTRY', isAllowed: true, createdAt: { gte: start, lte: end } } }),
      prisma.accessEvent.count({ where: { communityId, type: 'EXIT', isAllowed: true, createdAt: { gte: start, lte: end } } }),
      prisma.accessEvent.count({ where: { communityId, isAllowed: false, createdAt: { gte: start, lte: end } } }),
    ])

    data.push({
      date: format(date, 'EEE d'),
      entries,
      exits,
      denied,
    })
  }

  return data
}

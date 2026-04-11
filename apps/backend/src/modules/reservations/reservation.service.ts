import { PrismaClient, ReservationStatus } from '@prisma/client'
import type { CreateReservationInput, CancelReservationInput } from './reservation.schema.js'

// ============================================================
// Reservation Service — common area booking
// ============================================================

export async function listCommonAreas(prisma: PrismaClient, communityId: string) {
  return prisma.commonArea.findMany({
    where: { communityId, isActive: true },
    orderBy: { name: 'asc' },
  })
}

export async function getAvailableSlots(
  prisma: PrismaClient,
  communityId: string,
  areaId: string,
  date: string, // YYYY-MM-DD
) {
  const area = await prisma.commonArea.findFirst({
    where: { id: areaId, communityId, isActive: true },
  })

  if (!area) {
    const err = new Error('Common area not found') as any
    err.statusCode = 404
    throw err
  }

  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  // Get existing confirmed/pending reservations for this day
  const existingReservations = await prisma.reservation.findMany({
    where: {
      commonAreaId: areaId,
      status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
    },
    orderBy: { startTime: 'asc' },
    select: { startTime: true, endTime: true, status: true },
  })

  // Generate available slots based on openTime/closeTime and slotDurationMins
  // openTime/closeTime used directly via string interpolation below

  const slots: { startTime: string; endTime: string; available: boolean }[] = []
  const slotMs = area.slotDurationMins * 60 * 1000

  let cursor = new Date(`${date}T${area.openTime}:00`)
  const closeTime = new Date(`${date}T${area.closeTime}:00`)

  while (cursor.getTime() + slotMs <= closeTime.getTime()) {
    const slotStart = new Date(cursor)
    const slotEnd = new Date(cursor.getTime() + slotMs)

    // Check overlap with existing reservations
    const hasConflict = existingReservations.some(
      (r) => r.startTime < slotEnd && r.endTime > slotStart,
    )

    // Don't show past slots
    const isPast = slotStart < new Date()

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      available: !hasConflict && !isPast,
    })

    cursor = slotEnd
  }

  return { area, slots, date, existing: existingReservations }
}

export async function createReservation(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
  input: CreateReservationInput,
) {
  const startTime = new Date(input.startTime)
  const endTime = new Date(input.endTime)

  if (endTime <= startTime) {
    const err = new Error('endTime must be after startTime') as any
    err.statusCode = 400
    throw err
  }

  if (startTime < new Date()) {
    const err = new Error('Cannot book a slot in the past') as any
    err.statusCode = 400
    throw err
  }

  const area = await prisma.commonArea.findFirst({
    where: { id: input.commonAreaId, communityId, isActive: true },
  })

  if (!area) {
    const err = new Error('Common area not found') as any
    err.statusCode = 404
    throw err
  }

  if (area.capacity && input.attendees > area.capacity) {
    const err = new Error(`Capacity exceeded. Maximum: ${area.capacity}`) as any
    err.statusCode = 400
    throw err
  }

  // Advance booking limit
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + area.maxAdvanceDays)
  if (startTime > maxDate) {
    const err = new Error(`Cannot book more than ${area.maxAdvanceDays} days in advance`) as any
    err.statusCode = 400
    throw err
  }

  // Check for conflicts
  const conflict = await prisma.reservation.findFirst({
    where: {
      commonAreaId: input.commonAreaId,
      status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
      OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
    },
  })

  if (conflict) {
    const err = new Error('This time slot is already booked') as any
    err.statusCode = 409
    throw err
  }

  const reservation = await prisma.reservation.create({
    data: {
      communityId,
      userId,
      commonAreaId: input.commonAreaId,
      startTime,
      endTime,
      attendees: input.attendees,
      title: input.title,
      notes: input.notes,
      status: area.requiresApproval ? ReservationStatus.PENDING : ReservationStatus.CONFIRMED,
      feeAmount: area.feeAmount,
    },
    include: {
      commonArea: { select: { name: true, imageUrl: true } },
    },
  })

  return reservation
}

export async function listReservations(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
  isAdmin: boolean,
  upcoming = true,
  statusFilter?: string,
  showResidentInfo = false,
) {
  const now = new Date()
  const where: Record<string, unknown> = {
    communityId,
    ...(!isAdmin ? { userId } : {}),
    ...(upcoming ? { startTime: { gte: now } } : {}),
  }

  if (statusFilter) {
    where['status'] = statusFilter as ReservationStatus
  } else if (!statusFilter) {
    where['status'] = { notIn: [ReservationStatus.CANCELLED] as ReservationStatus[] }
  }

  const reservations = await prisma.reservation.findMany({
    where,
    orderBy: statusFilter === 'PENDING' ? { createdAt: 'asc' } : { startTime: 'asc' },
    take: 100,
    include: {
      commonArea: { select: { name: true, imageUrl: true, openTime: true, closeTime: true } },
      // Only include resident details for admins; residents only see their own
      user: showResidentInfo
        ? { select: { firstName: true, lastName: true, email: true } }
        : { select: { firstName: true, lastName: true } },
    },
  })

  // For non-admin residents: hide who made reservations that aren't theirs
  if (!isAdmin) {
    return reservations.map((r) => ({
      ...r,
      user: r.userId === userId ? r.user : null,
    }))
  }

  return reservations
}

export async function cancelReservation(
  prisma: PrismaClient,
  communityId: string,
  reservationId: string,
  userId: string,
  isAdmin: boolean,
  input: CancelReservationInput,
) {
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      communityId,
      ...(!isAdmin ? { userId } : {}),
    },
  })

  if (!reservation) {
    const err = new Error('Reservation not found') as any
    err.statusCode = 404
    throw err
  }

  if (reservation.status === ReservationStatus.CANCELLED) {
    const err = new Error('Reservation is already cancelled') as any
    err.statusCode = 400
    throw err
  }

  if (reservation.startTime < new Date() && !isAdmin) {
    const err = new Error('Cannot cancel a reservation that has already started') as any
    err.statusCode = 400
    throw err
  }

  return prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: input.reason,
    },
  })
}

export async function approveReservation(
  prisma: PrismaClient,
  communityId: string,
  reservationId: string,
  adminId: string,
) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, communityId, status: ReservationStatus.PENDING },
  })

  if (!reservation) {
    const err = new Error('Pending reservation not found') as any
    err.statusCode = 404
    throw err
  }

  return prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.CONFIRMED,
      approvedById: adminId,
      approvedAt: new Date(),
    },
  })
}

import { PrismaClient } from '@prisma/client'
import type { CheckInInput, CheckOutInput } from './staff.schema.js'

// ============================================================
// Staff Service — check-in/out and shift tracking
// ============================================================

export async function listStaff(prisma: PrismaClient, communityId: string) {
  return prisma.staff.findMany({
    where: { communityId, isActive: true },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true, pushToken: true } },
      checkIns: {
        where: { checkOutTime: null }, // active shift
        take: 1,
        orderBy: { checkInTime: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getMyStaffProfile(prisma: PrismaClient, communityId: string, userId: string) {
  const staff = await prisma.staff.findFirst({
    where: { communityId, userId },
    include: {
      checkIns: {
        orderBy: { checkInTime: 'desc' },
        take: 10,
      },
    },
  })

  if (!staff) {
    const err = new Error('Staff profile not found for this user') as any
    err.statusCode = 404
    throw err
  }

  return staff
}

export async function checkIn(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
  input: CheckInInput,
) {
  const staff = await prisma.staff.findFirst({ where: { communityId, userId } })
  if (!staff) {
    const err = new Error('Staff profile not found') as any
    err.statusCode = 404
    throw err
  }

  // Check if already checked in
  const activeShift = await prisma.staffCheckIn.findFirst({
    where: { staffId: staff.id, checkOutTime: null },
  })

  if (activeShift) {
    const err = new Error('You are already checked in. Check out first.') as any
    err.statusCode = 409
    throw err
  }

  return prisma.staffCheckIn.create({
    data: {
      staffId: staff.id,
      notes: input.notes,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
    },
  })
}

export async function checkOut(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
  input: CheckOutInput,
) {
  const staff = await prisma.staff.findFirst({ where: { communityId, userId } })
  if (!staff) {
    const err = new Error('Staff profile not found') as any
    err.statusCode = 404
    throw err
  }

  const activeShift = await prisma.staffCheckIn.findFirst({
    where: { staffId: staff.id, checkOutTime: null },
    orderBy: { checkInTime: 'desc' },
  })

  if (!activeShift) {
    const err = new Error('No active shift found. Check in first.') as any
    err.statusCode = 409
    throw err
  }

  const checkOutTime = new Date()
  const hoursWorked =
    (checkOutTime.getTime() - activeShift.checkInTime.getTime()) / (1000 * 60 * 60)

  return prisma.staffCheckIn.update({
    where: { id: activeShift.id },
    data: {
      checkOutTime,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      notes: input.notes
        ? `${activeShift.notes ? activeShift.notes + ' | ' : ''}Out: ${input.notes}`
        : activeShift.notes,
    },
  })
}

export async function getActiveShift(prisma: PrismaClient, communityId: string, userId: string) {
  const staff = await prisma.staff.findFirst({ where: { communityId, userId } })
  if (!staff) return null

  return prisma.staffCheckIn.findFirst({
    where: { staffId: staff.id, checkOutTime: null },
    orderBy: { checkInTime: 'desc' },
  })
}

export async function getShiftHistory(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
  limit = 20,
) {
  const staff = await prisma.staff.findFirst({ where: { communityId, userId } })
  if (!staff) return []

  return prisma.staffCheckIn.findMany({
    where: { staffId: staff.id, checkOutTime: { not: null } },
    orderBy: { checkInTime: 'desc' },
    take: limit,
  })
}

import { PrismaClient, VisitorPassStatus, AccessMethod, AccessEventType } from '@prisma/client'
import type { Redis } from 'ioredis'
import { signQRPayload, verifyQRPayload, generateQRImage } from '../../lib/qr.js'
import { sendPushNotification } from '../notifications/notification.service.js'
import type { CreateVisitorPassInput, ScanQRInput } from './visitor.schema.js'

// ============================================================
// Visitor Service — QR pass lifecycle + gate scanning
// ============================================================

export async function createVisitorPass(
  prisma: PrismaClient,
  communityId: string,
  createdById: string,
  input: CreateVisitorPassInput,
) {
  // Validate communityId before any DB work
  if (!communityId || communityId === 'undefined' || communityId === 'null') {
    const err = new Error('No community selected. Please log out and log in again.') as any
    err.statusCode = 400
    throw err
  }

  const community = await prisma.community.findUnique({ where: { id: communityId } })
  if (!community) {
    const err = new Error('Community not found') as any
    err.statusCode = 404
    throw err
  }

  const validFrom = input.validFrom ? new Date(input.validFrom) : new Date()
  const validUntil = new Date(input.validUntil)

  if (validUntil <= validFrom) {
    const err = new Error('validUntil must be after validFrom') as any
    err.statusCode = 400
    throw err
  }

  // Create pass first to get the ID, then attach QR
  const pass = await prisma.visitorPass.create({
    data: {
      communityId,
      createdById,
      visitorName: input.visitorName,
      visitorPhone: input.visitorPhone,
      visitorEmail: input.visitorEmail || null,
      plateNumber: input.plateNumber,
      validFrom,
      validUntil,
      maxUses: input.maxUses ?? 1,
      notes: input.notes,
      qrCode: 'pending', // temp value, updated below
    },
  })

  // Sign QR token with passId embedded
  const qrToken = signQRPayload(pass.id, communityId, validUntil)
  const qrCodeImageUrl = await generateQRImage(qrToken)

  const updated = await prisma.visitorPass.update({
    where: { id: pass.id },
    data: { qrCode: qrToken, qrCodeImageUrl },
    include: { createdBy: { select: { firstName: true, lastName: true, email: true } } },
  })

  return updated
}

export async function listVisitorPasses(
  prisma: PrismaClient,
  communityId: string,
  createdById: string | null, // null = admin sees all
  status?: VisitorPassStatus,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit
  const where = {
    communityId,
    ...(createdById ? { createdById } : {}),
    ...(status ? { status } : {}),
  }

  const [passes, total] = await Promise.all([
    prisma.visitorPass.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.visitorPass.count({ where }),
  ])

  return { passes, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getVisitorPass(
  prisma: PrismaClient,
  communityId: string,
  passId: string,
  requestingUserId: string,
  isAdmin: boolean,
) {
  const pass = await prisma.visitorPass.findFirst({
    where: {
      id: passId,
      communityId,
      ...(!isAdmin ? { createdById: requestingUserId } : {}),
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      accessEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!pass) {
    const err = new Error('Visitor pass not found') as any
    err.statusCode = 404
    throw err
  }

  return pass
}

export async function revokeVisitorPass(
  prisma: PrismaClient,
  communityId: string,
  passId: string,
  requestingUserId: string,
  isAdmin: boolean,
  reason?: string,
) {
  const pass = await prisma.visitorPass.findFirst({
    where: {
      id: passId,
      communityId,
      ...(!isAdmin ? { createdById: requestingUserId } : {}),
    },
  })

  if (!pass) {
    const err = new Error('Visitor pass not found') as any
    err.statusCode = 404
    throw err
  }

  if (pass.status !== VisitorPassStatus.ACTIVE) {
    const err = new Error(`Pass is already ${pass.status.toLowerCase()}`) as any
    err.statusCode = 400
    throw err
  }

  return prisma.visitorPass.update({
    where: { id: passId },
    data: {
      status: VisitorPassStatus.REVOKED,
      notes: reason ? `${pass.notes ? pass.notes + ' | ' : ''}Revoked: ${reason}` : pass.notes,
    },
  })
}

// ── Gate scanning ─────────────────────────────────────────────

export async function scanQRCode(
  prisma: PrismaClient,
  redis: Redis,
  communityId: string,
  guardId: string,
  input: ScanQRInput,
) {
  // 1. Verify cryptographic signature + expiry
  let payload: { pid: string; cid: string; exp: number }
  try {
    payload = verifyQRPayload(input.qrToken)
  } catch (err: any) {
    // Log denied attempt
    await logAccessEvent(prisma, {
      communityId,
      guardId,
      type: input.type,
      method: AccessMethod.QR_CODE,
      personName: 'Unknown',
      isAllowed: false,
      deniedReason: err.message,
      notes: input.notes,
    })
    const error = new Error(err.message) as any
    error.statusCode = 400
    throw error
  }

  // 2. Community must match
  if (payload.cid !== communityId) {
    await logAccessEvent(prisma, {
      communityId,
      guardId,
      type: input.type,
      method: AccessMethod.QR_CODE,
      personName: 'Unknown',
      isAllowed: false,
      deniedReason: 'QR code belongs to a different community',
      notes: input.notes,
    })
    const err = new Error('QR code does not belong to this community') as any
    err.statusCode = 403
    throw err
  }

  // 3. Load pass from DB
  const pass = await prisma.visitorPass.findUnique({
    where: { id: payload.pid },
    include: { createdBy: { select: { firstName: true, lastName: true, pushToken: true } } },
  })

  if (!pass) {
    const err = new Error('Visitor pass not found') as any
    err.statusCode = 404
    throw err
  }

  // 4. Check pass status
  const now = new Date()
  let deniedReason: string | null = null

  if (pass.status === VisitorPassStatus.REVOKED) {
    deniedReason = 'Pass has been revoked'
  } else if (pass.status === VisitorPassStatus.EXPIRED || pass.validUntil < now) {
    deniedReason = 'Pass has expired'
  } else if (pass.validFrom > now) {
    deniedReason = `Pass is not valid until ${pass.validFrom.toISOString()}`
  } else if (pass.usedCount >= pass.maxUses && pass.maxUses > 0) {
    deniedReason = `Pass has reached its maximum uses (${pass.maxUses})`
  }

  if (deniedReason) {
    await logAccessEvent(prisma, {
      communityId,
      guardId,
      visitorPassId: pass.id,
      type: input.type,
      method: AccessMethod.QR_CODE,
      personName: pass.visitorName,
      plateNumber: pass.plateNumber ?? undefined,
      isAllowed: false,
      deniedReason,
      notes: input.notes,
    })

    // Update status to EXPIRED if needed
    if (pass.status === VisitorPassStatus.ACTIVE && pass.validUntil < now) {
      await prisma.visitorPass.update({
        where: { id: pass.id },
        data: { status: VisitorPassStatus.EXPIRED },
      })
    }

    const err = new Error(deniedReason) as any
    err.statusCode = 403
    throw err
  }

  // 5. Allow — increment usedCount, update status if exhausted
  const newUsedCount = pass.usedCount + 1
  const newStatus =
    newUsedCount >= pass.maxUses ? VisitorPassStatus.USED : VisitorPassStatus.ACTIVE

  await prisma.visitorPass.update({
    where: { id: pass.id },
    data: { usedCount: newUsedCount, status: newStatus },
  })

  // 6. Create access event
  const accessEvent = await logAccessEvent(prisma, {
    communityId,
    guardId,
    visitorPassId: pass.id,
    type: input.type,
    method: AccessMethod.QR_CODE,
    personName: pass.visitorName,
    plateNumber: pass.plateNumber ?? undefined,
    isAllowed: true,
    notes: input.notes,
  })

  // 7. Notify resident — Redis pub/sub (real-time) + push notification
  try {
    await redis.publish(
      `community:${communityId}:access`,
      JSON.stringify({
        event: 'visitor_arrived',
        passId: pass.id,
        visitorName: pass.visitorName,
        type: input.type,
        guardId,
        timestamp: new Date().toISOString(),
        createdById: pass.createdById,
        pushToken: pass.createdBy.pushToken,
      }),
    )

    // Push notification to the resident who created the pass
    await sendPushNotification(prisma, {
      userIds: [pass.createdById],
      title: 'Visita en puerta',
      body: `${pass.visitorName} ha ${input.type === 'ENTRY' ? 'llegado' : 'salido'}`,
      type: 'visitor_arrived',
      data: { passId: pass.id, visitorName: pass.visitorName },
    })
  } catch {
    // Non-fatal — notification failure should not block gate
  }

  return {
    allowed: true,
    pass: {
      id: pass.id,
      visitorName: pass.visitorName,
      visitorPhone: pass.visitorPhone,
      plateNumber: pass.plateNumber,
      validUntil: pass.validUntil,
      usedCount: newUsedCount,
      maxUses: pass.maxUses,
      status: newStatus,
      createdBy: pass.createdBy,
    },
    accessEvent,
  }
}

// ── Access log helpers ────────────────────────────────────────

async function logAccessEvent(
  prisma: PrismaClient,
  data: {
    communityId: string
    guardId?: string
    visitorPassId?: string
    type: AccessEventType
    method: AccessMethod
    personName: string
    plateNumber?: string
    isAllowed: boolean
    deniedReason?: string
    notes?: string
  },
) {
  return prisma.accessEvent.create({
    data: {
      communityId: data.communityId,
      scannedByGuardId: data.guardId,
      visitorPassId: data.visitorPassId,
      type: data.type,
      method: data.method,
      personName: data.personName,
      plateNumber: data.plateNumber,
      isAllowed: data.isAllowed,
      deniedReason: data.deniedReason,
      notes: data.notes,
    },
  })
}

export async function listAccessEvents(
  prisma: PrismaClient,
  communityId: string,
  page = 1,
  limit = 50,
) {
  const skip = (page - 1) * limit
  const [events, total] = await Promise.all([
    prisma.accessEvent.findMany({
      where: { communityId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        visitorPass: { select: { visitorName: true, createdById: true } },
      },
    }),
    prisma.accessEvent.count({ where: { communityId } }),
  ])

  return { events, total, page, limit, pages: Math.ceil(total / limit) }
}

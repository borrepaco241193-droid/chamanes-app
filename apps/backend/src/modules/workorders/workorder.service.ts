import { PrismaClient, WorkOrderStatus } from '@prisma/client'
import type {
  CreateWorkOrderInput,
  UpdateStatusInput,
  AssignInput,
  AddCommentInput,
} from './workorder.schema.js'

// ============================================================
// Work Order Service
// ============================================================

export async function createWorkOrder(
  prisma: PrismaClient,
  communityId: string,
  reportedById: string,
  input: CreateWorkOrderInput,
) {
  return prisma.workOrder.create({
    data: {
      communityId,
      reportedById,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      location: input.location,
      unitId: input.unitId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      imageUrls: [],
    },
    include: { assignments: { include: { staff: true } }, comments: true },
  })
}

export async function listWorkOrders(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
  isAdmin: boolean,
  status?: WorkOrderStatus,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit

  // Staff see only their assigned orders; admins see all
  let where: any = { communityId }
  if (status) where.status = status

  if (!isAdmin) {
    // Find staff record for this user
    const staffRecord = await prisma.staff.findFirst({ where: { communityId, userId } })
    if (staffRecord) {
      where.assignments = { some: { staffId: staffRecord.id } }
    } else {
      // Non-admin non-staff can only see work orders they reported
      where.reportedById = userId
    }
  }

  const [orders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        assignments: {
          include: { staff: { include: { checkIns: false } } },
          take: 3,
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.workOrder.count({ where }),
  ])

  return { orders, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getWorkOrder(
  prisma: PrismaClient,
  communityId: string,
  workOrderId: string,
) {
  const order = await prisma.workOrder.findFirst({
    where: { id: workOrderId, communityId },
    include: {
      assignments: {
        include: {
          staff: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
        },
      },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!order) {
    const err = new Error('Work order not found') as any
    err.statusCode = 404
    throw err
  }

  return order
}

export async function updateWorkOrderStatus(
  prisma: PrismaClient,
  communityId: string,
  workOrderId: string,
  input: UpdateStatusInput,
) {
  const order = await prisma.workOrder.findFirst({ where: { id: workOrderId, communityId } })
  if (!order) {
    const err = new Error('Work order not found') as any
    err.statusCode = 404
    throw err
  }

  return prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      status: input.status as WorkOrderStatus,
      completedAt: input.status === 'COMPLETED' ? new Date() : undefined,
    },
  })
}

export async function assignWorkOrder(
  prisma: PrismaClient,
  communityId: string,
  workOrderId: string,
  input: AssignInput,
) {
  const order = await prisma.workOrder.findFirst({ where: { id: workOrderId, communityId } })
  if (!order) {
    const err = new Error('Work order not found') as any
    err.statusCode = 404
    throw err
  }

  // Check staff belongs to this community
  const staff = await prisma.staff.findFirst({
    where: { id: input.staffId, communityId },
  })
  if (!staff) {
    const err = new Error('Staff member not found in this community') as any
    err.statusCode = 404
    throw err
  }

  // Upsert assignment
  await prisma.workOrderAssignment.upsert({
    where: {
      // No unique key on (workOrderId, staffId) — just create
      id: `${workOrderId}-${input.staffId}`, // won't exist, always create
    },
    update: {},
    create: {
      workOrderId,
      staffId: input.staffId,
      notes: input.notes,
    },
  }).catch(async () => {
    // Fallback: just create (upsert may fail on missing composite unique)
    const existing = await prisma.workOrderAssignment.findFirst({
      where: { workOrderId, staffId: input.staffId },
    })
    if (!existing) {
      await prisma.workOrderAssignment.create({
        data: { workOrderId, staffId: input.staffId, notes: input.notes },
      })
    }
  })

  // Move to ASSIGNED status if still OPEN
  if (order.status === WorkOrderStatus.OPEN) {
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: WorkOrderStatus.ASSIGNED },
    })
  }

  return getWorkOrder(prisma, communityId, workOrderId)
}

export async function addComment(
  prisma: PrismaClient,
  communityId: string,
  workOrderId: string,
  authorId: string,
  input: AddCommentInput,
) {
  const order = await prisma.workOrder.findFirst({ where: { id: workOrderId, communityId } })
  if (!order) {
    const err = new Error('Work order not found') as any
    err.statusCode = 404
    throw err
  }

  return prisma.workOrderComment.create({
    data: {
      workOrderId,
      authorId,
      body: input.body,
      imageUrls: [],
    },
  })
}

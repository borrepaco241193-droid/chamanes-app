import { PrismaClient, PaymentStatus, PaymentType } from '@prisma/client'
import { stripe } from '../../lib/stripe.js'
import type { GenerateFeesInput } from './payment.schema.js'

// ============================================================
// Payment Service
// Flow: Admin generates monthly fees → Resident pays via
//       Stripe Checkout (browser redirect) → webhook confirms
// ============================================================

// ── List payments ─────────────────────────────────────────────

export async function listPayments(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
  isAdmin: boolean,
  page = 1,
  limit = 20,
  status?: PaymentStatus,
) {
  const skip = (page - 1) * limit
  const where = {
    communityId,
    ...(!isAdmin ? { userId } : {}),
    ...(status ? { status } : {}),
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        unit: { select: { number: true, block: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.payment.count({ where }),
  ])

  return { payments, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getPayment(
  prisma: PrismaClient,
  communityId: string,
  paymentId: string,
  userId: string,
  isAdmin: boolean,
) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      communityId,
      ...(!isAdmin ? { userId } : {}),
    },
    include: {
      unit: { select: { number: true, block: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  if (!payment) {
    const err = new Error('Payment not found') as any
    err.statusCode = 404
    throw err
  }

  return payment
}

// ── Admin: generate monthly maintenance fees for all units ────

export async function generateMonthlyFees(
  prisma: PrismaClient,
  communityId: string,
  input: GenerateFeesInput,
) {
  const community = await prisma.community.findUnique({ where: { id: communityId } })
  if (!community) {
    const err = new Error('Community not found') as any
    err.statusCode = 404
    throw err
  }

  const settings = community.settings as any
  const feeAmount = input.amount ?? settings.maintenanceFeeAmount ?? 1000
  const dueDayOfMonth = settings.paymentDueDayOfMonth ?? 5

  const dueDate = input.dueDate
    ? new Date(input.dueDate)
    : new Date(input.year, input.month - 1, dueDayOfMonth, 12, 0, 0) // noon on due day

  // Get all occupied units with their primary resident
  const units = await prisma.unit.findMany({
    where: { communityId, isOccupied: true },
    include: {
      residents: {
        where: { isPrimary: true },
        include: {
          communityUser: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  })

  const created: string[] = []
  const skipped: string[] = []

  for (const unit of units) {
    const primaryResident = unit.residents[0]
    if (!primaryResident?.communityUser?.user) {
      skipped.push(unit.number)
      continue
    }

    const userId = primaryResident.communityUser.user.id

    // Check if fee already exists for this period
    const existing = await prisma.payment.findFirst({
      where: {
        communityId,
        unitId: unit.id,
        periodMonth: input.month,
        periodYear: input.year,
        type: PaymentType.MAINTENANCE_FEE,
      },
    })

    if (existing) {
      skipped.push(unit.number)
      continue
    }

    await prisma.payment.create({
      data: {
        communityId,
        userId,
        unitId: unit.id,
        amount: feeAmount,
        currency: community.currency,
        type: PaymentType.MAINTENANCE_FEE,
        description: `Cuota de mantenimiento ${getMonthName(input.month)} ${input.year}`,
        status: PaymentStatus.PENDING,
        dueDate,
        periodMonth: input.month,
        periodYear: input.year,
      },
    })

    created.push(unit.number)
  }

  return {
    generated: created.length,
    skipped: skipped.length,
    units: { created, skipped },
  }
}

// ── Stripe Checkout Session ───────────────────────────────────

export async function createCheckoutSession(
  prisma: PrismaClient,
  communityId: string,
  paymentId: string,
  userId: string,
  isAdmin: boolean,
  successUrl: string,
  cancelUrl: string,
) {
  const payment = await getPayment(prisma, communityId, paymentId, userId, isAdmin)

  if (payment.status === PaymentStatus.COMPLETED) {
    const err = new Error('This payment is already paid') as any
    err.statusCode = 400
    throw err
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    const err = new Error('This payment has been refunded') as any
    err.statusCode = 400
    throw err
  }

  // Calculate late fee if past due
  let totalAmount = Number(payment.amount)
  let lateFeeAmount = 0
  const community = await prisma.community.findUnique({ where: { id: communityId } })
  const settings = community?.settings as any

  if (payment.dueDate && payment.dueDate < new Date() && !payment.lateFeeApplied) {
    const lateFeePct = settings?.lateFeePct ?? 0
    if (lateFeePct > 0) {
      lateFeeAmount = Math.round(totalAmount * (lateFeePct / 100) * 100) / 100
      totalAmount += lateFeeAmount
    }
  }

  const amountInCents = Math.round(totalAmount * 100)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: (payment.currency ?? 'MXN').toLowerCase(),
          unit_amount: amountInCents,
          product_data: {
            name: payment.description,
            description: lateFeeAmount > 0 ? `Incluye recargo por pago tardío: $${lateFeeAmount}` : undefined,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: payment.user.email,
    metadata: {
      paymentId: payment.id,
      communityId,
      userId: payment.userId,
      lateFeeAmount: String(lateFeeAmount),
    },
  })

  // Mark as processing
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PROCESSING,
      stripePaymentIntentId: session.payment_intent as string | null,
      ...(lateFeeAmount > 0 ? { lateFeeApplied: true, lateFeeAmount } : {}),
    },
  })

  return { checkoutUrl: session.url, sessionId: session.id }
}

// ── Stripe Webhook ────────────────────────────────────────────

export async function handleStripeWebhook(
  prisma: PrismaClient,
  payload: Buffer,
  signature: string,
  webhookSecret: string,
) {
  let event: any

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch {
    const err = new Error('Invalid webhook signature') as any
    err.statusCode = 400
    throw err
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const { paymentId } = session.metadata ?? {}

      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent,
            stripeReceiptUrl: session.receipt_url ?? null,
          },
        })
      }
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object
      const { paymentId } = session.metadata ?? {}

      if (paymentId) {
        // Revert to PENDING so they can try again
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.PENDING, stripePaymentIntentId: null },
        })
      }
      break
    }
  }

  return { received: true }
}

// ── Helpers ───────────────────────────────────────────────────

function getMonthName(month: number): string {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return names[month - 1] ?? String(month)
}

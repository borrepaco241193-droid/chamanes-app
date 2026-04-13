import { FastifyPluginAsync } from 'fastify'
import { UserRole } from '@prisma/client'
import { generateFeesSchema, createCheckoutSchema } from './payment.schema.js'
import {
  listPayments,
  getPayment,
  generateMonthlyFees,
  createCheckoutSession,
  createPaymentIntent,
  handleStripeWebhook,
} from './payment.service.js'
import { env } from '../../config/env.js'

// ============================================================
// Payment Routes
//
// GET    /communities/:id/payments                — list payments
// GET    /communities/:id/payments/:paymentId     — payment detail
// POST   /communities/:id/payments/generate       — admin: generate monthly fees
// POST   /communities/:id/payments/:paymentId/checkout — get Stripe checkout URL
// POST   /webhooks/stripe                         — Stripe webhook (no auth)
// ============================================================

const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  // ── List payments ─────────────────────────────────────────
  fastify.get<{
    Params: { communityId: string }
    Querystring: { status?: string; page?: string; limit?: string }
  }>('/:communityId/payments', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    // Check role from JWT first, then fall back to DB lookup (handles stale tokens)
    const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as string[]
    const effectiveRole = req.user.communityRole ?? req.user.role
    let isAdmin = ADMIN_ROLES.includes(effectiveRole) || req.user.role === UserRole.SUPER_ADMIN

    // If JWT says RESIDENT but user might actually be admin — verify in DB
    if (!isAdmin) {
      const cu = await fastify.prisma.communityUser.findUnique({
        where: { userId_communityId: { userId: req.user.sub, communityId: req.params.communityId } },
        select: { role: true },
      })
      if (cu && ADMIN_ROLES.includes(cu.role)) isAdmin = true
    }

    const result = await listPayments(
      fastify.prisma,
      req.params.communityId,
      req.user.sub,
      isAdmin,
      req.query.page ? parseInt(req.query.page) : 1,
      req.query.limit ? parseInt(req.query.limit) : 20,
      req.query.status as any,
    )
    return reply.send(result)
  })

  // ── Get single payment ────────────────────────────────────
  fastify.get<{ Params: { communityId: string; paymentId: string } }>(
    '/:communityId/payments/:paymentId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const ADMIN_ROLES = [UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as string[]
      const effectiveRole = req.user.communityRole ?? req.user.role
      let isAdmin = ADMIN_ROLES.includes(effectiveRole) || req.user.role === UserRole.SUPER_ADMIN
      if (!isAdmin) {
        const cu = await fastify.prisma.communityUser.findUnique({
          where: { userId_communityId: { userId: req.user.sub, communityId: req.params.communityId } },
          select: { role: true },
        })
        if (cu && ADMIN_ROLES.includes(cu.role)) isAdmin = true
      }
      const payment = await getPayment(
        fastify.prisma,
        req.params.communityId,
        req.params.paymentId,
        req.user.sub,
        isAdmin,
      )
      return reply.send(payment)
    },
  )

  // ── Admin: generate monthly fees ──────────────────────────
  fastify.post<{ Params: { communityId: string }; Body: unknown }>(
    '/:communityId/payments/generate',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
      ],
    },
    async (req, reply) => {
      const body = generateFeesSchema.parse(req.body)
      const result = await generateMonthlyFees(fastify.prisma, req.params.communityId, body)
      return reply.code(201).send(result)
    },
  )

  // ── Create Stripe Checkout Session (fallback/web) ────────
  fastify.post<{ Params: { communityId: string; paymentId: string }; Body: unknown }>(
    '/:communityId/payments/:paymentId/checkout',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      if (!env.STRIPE_SECRET_KEY) {
        return reply.code(503).send({
          error: 'ServiceUnavailable',
          message: 'El procesamiento de pagos no está configurado aún. Contacta al administrador.',
        })
      }

      const body = createCheckoutSchema.parse(req.body ?? {})
      const isAdmin = ([UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN] as string[]).includes(
        req.user.communityRole ?? req.user.role,
      )

      const apiUrl = env.API_URL
      const successUrl =
        body.successUrl ?? `${apiUrl}/payment-success?paymentId=${req.params.paymentId}`
      const cancelUrl = body.cancelUrl ?? `${apiUrl}/payment-cancel`

      const result = await createCheckoutSession(
        fastify.prisma,
        req.params.communityId,
        req.params.paymentId,
        req.user.sub,
        isAdmin,
        successUrl,
        cancelUrl,
      )
      return reply.send(result)
    },
  )

  // ── Create Payment Intent (native Payment Sheet) ──────────
  fastify.post<{ Params: { communityId: string; paymentId: string } }>(
    '/:communityId/payments/:paymentId/payment-intent',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      if (!env.STRIPE_SECRET_KEY) {
        return reply.code(503).send({
          error: 'ServiceUnavailable',
          message: 'El procesamiento de pagos no está configurado aún.',
        })
      }

      const isAdmin = ([UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as string[]).includes(
        req.user.communityRole ?? req.user.role,
      )

      const result = await createPaymentIntent(
        fastify.prisma,
        req.params.communityId,
        req.params.paymentId,
        req.user.sub,
        isAdmin,
      )

      return reply.send({
        ...result,
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      })
    },
  )
}

// ── Stripe Webhook (registered separately, no auth) ──────────
export const stripeWebhookRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/webhooks/stripe',
    {
      config: { rawBody: true }, // need raw body for signature verification
    },
    async (req, reply) => {
      const sig = req.headers['stripe-signature'] as string
      if (!sig) {
        return reply.code(400).send({ error: 'Missing stripe-signature header' })
      }

      if (!env.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET === 'whsec_placeholder_set_after_stripe_listen') {
        // In development without stripe CLI, skip webhook verification
        fastify.log.warn('Stripe webhook secret not configured — skipping webhook')
        return reply.send({ received: true })
      }

      const payload = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body))

      const result = await handleStripeWebhook(
        fastify.prisma,
        payload,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
      )
      return reply.send(result)
    },
  )
}

export default paymentRoutes

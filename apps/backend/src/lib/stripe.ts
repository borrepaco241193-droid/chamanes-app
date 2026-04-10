import Stripe from 'stripe'
import { env } from '../config/env.js'

// ============================================================
// Stripe client — initialized once, used across services
// ============================================================

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required for payment processing')
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  typescript: true,
})

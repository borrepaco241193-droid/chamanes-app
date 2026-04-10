import Stripe from 'stripe'
import { env } from '../config/env.js'

// ============================================================
// Stripe client — lazy singleton, only throws when actually used
// ============================================================

let _stripe: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) {
      if (!env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is required for payment processing')
      }
      _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
        typescript: true,
      })
    }
    const value = (_stripe as any)[prop]
    return typeof value === 'function' ? value.bind(_stripe) : value
  },
})

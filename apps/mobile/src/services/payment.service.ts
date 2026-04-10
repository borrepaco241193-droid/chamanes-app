import api from '../lib/api'

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'

export interface Payment {
  id: string
  communityId: string
  userId: string
  unitId: string
  amount: number
  currency: string
  type: string
  description: string
  status: PaymentStatus
  dueDate?: string
  paidAt?: string
  periodMonth?: number
  periodYear?: number
  lateFeeApplied: boolean
  lateFeeAmount: number
  stripeReceiptUrl?: string
  unit?: { number: string; block?: string }
  user?: { firstName: string; lastName: string; email: string }
}

export const paymentService = {
  async list(
    communityId: string,
    params?: { status?: PaymentStatus; page?: number; limit?: number },
  ): Promise<{ payments: Payment[]; total: number; pages: number }> {
    const res = await api.get(`/communities/${communityId}/payments`, { params })
    return res.data
  },

  async get(communityId: string, paymentId: string): Promise<Payment> {
    const res = await api.get(`/communities/${communityId}/payments/${paymentId}`)
    return res.data
  },

  async getCheckoutUrl(
    communityId: string,
    paymentId: string,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    const res = await api.post(`/communities/${communityId}/payments/${paymentId}/checkout`, {
      // These URLs just give the user a confirmation page in the browser
      // The actual payment status is updated via Stripe webhook
      successUrl: 'https://chamanes.app/payment-success',
      cancelUrl: 'https://chamanes.app/payment-cancel',
    })
    return res.data
  },

  async generateFees(
    communityId: string,
    data: { month: number; year: number; amount?: number },
  ) {
    const res = await api.post(`/communities/${communityId}/payments/generate`, data)
    return res.data
  },
}

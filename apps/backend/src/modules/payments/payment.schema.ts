import { z } from 'zod'

export const generateFeesSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2100),
  amount: z.number().positive().optional(), // overrides community settings
  dueDate: z.string().datetime().optional(),
})

export const createCheckoutSchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

export type GenerateFeesInput = z.infer<typeof generateFeesSchema>
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>

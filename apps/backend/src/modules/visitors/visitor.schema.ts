import { z } from 'zod'

export const createVisitorPassSchema = z.object({
  visitorName: z.string().min(2).max(100).trim(),
  visitorPhone: z.string().optional(),
  visitorEmail: z.string().email().optional().or(z.literal('')),
  plateNumber: z.string().max(20).optional(),
  validFrom: z.string().datetime().optional(), // ISO string, defaults to now
  validUntil: z.string().datetime(),
  maxUses: z.number().int().min(1).max(50).default(1),
  notes: z.string().max(500).optional(),
})

export const scanQRSchema = z.object({
  qrToken: z.string().min(1),
  type: z.enum(['ENTRY', 'EXIT']),
  notes: z.string().optional(),
})

export const revokePassSchema = z.object({
  reason: z.string().optional(),
})

export type CreateVisitorPassInput = z.infer<typeof createVisitorPassSchema>
export type ScanQRInput = z.infer<typeof scanQRSchema>

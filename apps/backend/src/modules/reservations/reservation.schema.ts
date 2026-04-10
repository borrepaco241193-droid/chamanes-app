import { z } from 'zod'

export const createReservationSchema = z.object({
  commonAreaId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendees: z.number().int().min(1).default(1),
  title: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export const cancelReservationSchema = z.object({
  reason: z.string().max(300).optional(),
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>

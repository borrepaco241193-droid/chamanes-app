import { z } from 'zod'

export const checkInSchema = z.object({
  notes: z.string().max(300).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
})

export const checkOutSchema = z.object({
  notes: z.string().max(300).optional(),
})

export type CheckInInput = z.infer<typeof checkInSchema>
export type CheckOutInput = z.infer<typeof checkOutSchema>

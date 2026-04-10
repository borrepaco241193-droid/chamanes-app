import { z } from 'zod'

export const createWorkOrderSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(5).max(1000),
  category: z.enum(['maintenance', 'cleaning', 'security', 'other']).default('maintenance'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  location: z.string().max(100).optional(),
  unitId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
})

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().max(300).optional(),
})

export const assignSchema = z.object({
  staffId: z.string().min(1),
  notes: z.string().max(300).optional(),
})

export const addCommentSchema = z.object({
  body: z.string().min(1).max(1000),
})

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type AssignInput = z.infer<typeof assignSchema>
export type AddCommentInput = z.infer<typeof addCommentSchema>

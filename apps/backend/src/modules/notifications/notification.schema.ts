import { z } from 'zod'

export const registerPushTokenSchema = z.object({
  pushToken: z.string().min(1),
})

export const sendNotificationSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(500),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  type: z.string().default('announcement'),
  data: z.record(z.string()).optional(),
})

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>

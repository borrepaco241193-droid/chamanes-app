import { z } from 'zod'

// ============================================================
// Zod schemas — validate every auth request body
// Invalid input is rejected before it touches the database
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  phone: z.string().optional(),
  inviteToken: z.string().optional(), // For resident self-registration
})

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, 'La contraseña debe tener al menos 12 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un caracter especial'),
})

export const changeEmailSchema = z.object({
  newEmail: z.string().email('Correo inválido').toLowerCase().trim(),
  currentPassword: z.string().min(1, 'Se requiere la contraseña actual'),
})

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

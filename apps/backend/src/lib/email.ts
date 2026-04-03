import { env } from '../config/env.js'

// ============================================================
// Email service — uses Resend when configured
// Falls back to console.log in development so the app works
// without a Resend account during local development
// ============================================================

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  // In development without Resend configured, just log the email
  if (!env.RESEND_API_KEY) {
    console.log('\n📧 [DEV EMAIL — configure RESEND_API_KEY to send real emails]')
    console.log(`   To:      ${to}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Body:    ${html.replace(/<[^>]+>/g, '').substring(0, 200)}`)
    console.log('')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  })

  if (error) throw new Error(`Email failed: ${error.message}`)
}

export function passwordResetEmail(firstName: string, resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="background: #3B82F6; width: 56px; height: 56px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
          <span style="color: white; font-size: 28px; font-weight: bold;">C</span>
        </div>
        <h1 style="color: #0F172A; font-size: 24px; margin: 0;">Chamanes</h1>
      </div>
      <h2 style="color: #1E293B;">Hola ${firstName},</h2>
      <p style="color: #475569; line-height: 1.6;">
        Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar.
        Este enlace expira en <strong>1 hora</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}"
           style="background: #3B82F6; color: white; padding: 14px 32px; border-radius: 12px;
                  text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
          Restablecer contraseña
        </a>
      </div>
      <p style="color: #94A3B8; font-size: 14px;">
        Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.
      </p>
    </div>
  `
}

export function verifyEmailTemplate(firstName: string, verifyUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="background: #3B82F6; width: 56px; height: 56px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
          <span style="color: white; font-size: 28px; font-weight: bold;">C</span>
        </div>
        <h1 style="color: #0F172A; font-size: 24px; margin: 0;">Chamanes</h1>
      </div>
      <h2 style="color: #1E293B;">Bienvenido, ${firstName}!</h2>
      <p style="color: #475569; line-height: 1.6;">
        Gracias por unirte a Chamanes. Verifica tu correo electrónico para activar tu cuenta.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}"
           style="background: #3B82F6; color: white; padding: 14px 32px; border-radius: 12px;
                  text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
          Verificar correo
        </a>
      </div>
    </div>
  `
}

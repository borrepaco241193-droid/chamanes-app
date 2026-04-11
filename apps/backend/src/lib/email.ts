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

// ── Shared layout wrapper ─────────────────────────────────────

function emailWrapper(content: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
      <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <div style="background: #0F172A; padding: 24px 28px; display: flex; align-items: center; gap: 12px;">
          <div style="background: #3B82F6; width: 40px; height: 40px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 22px; font-weight: bold;">C</span>
          </div>
          <span style="color: white; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Chamanes</span>
        </div>
        <div style="padding: 28px;">
          ${content}
        </div>
        <div style="background: #f1f5f9; padding: 16px 28px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Este correo fue generado automáticamente — no respondas a este mensaje.</p>
        </div>
      </div>
    </div>
  `
}

export function newWorkOrderEmail(
  order: { title: string; description: string; category: string; priority: string; location?: string | null },
  communityName: string,
  reporterName: string,
): string {
  const priorityColor: Record<string, string> = {
    URGENT: '#EF4444', HIGH: '#F97316', MEDIUM: '#F59E0B', LOW: '#64748B',
  }
  const priorityLabel: Record<string, string> = {
    URGENT: 'Urgente', HIGH: 'Alto', MEDIUM: 'Medio', LOW: 'Bajo',
  }
  const color = priorityColor[order.priority] ?? '#64748B'
  const label = priorityLabel[order.priority] ?? order.priority

  return emailWrapper(`
    <h2 style="color: #0F172A; margin: 0 0 4px;">Nueva orden de trabajo</h2>
    <p style="color: #64748B; font-size: 14px; margin: 0 0 24px;">${communityName} · Reportada por ${reporterName}</p>

    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid ${color};">
      <p style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1E293B;">${order.title}</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">${order.description}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748B; font-size: 13px; width: 120px;">Prioridad</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="background: ${color}20; color: ${color}; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px;">${label}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748B; font-size: 13px;">Categoría</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #1E293B; font-size: 13px; text-transform: capitalize;">${order.category}</td>
      </tr>
      ${order.location ? `
      <tr>
        <td style="padding: 8px 0; color: #64748B; font-size: 13px;">Ubicación</td>
        <td style="padding: 8px 0; color: #1E293B; font-size: 13px;">${order.location}</td>
      </tr>` : ''}
    </table>

    <p style="color: #94A3B8; font-size: 13px;">Abre la app para asignar personal y dar seguimiento.</p>
  `)
}

export function newReservationEmail(
  reservation: { startTime: Date | string; endTime: Date | string; attendees: number; notes?: string | null },
  communityName: string,
  areaName: string,
  residentName: string,
): string {
  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)
  const dateStr = start.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`

  return emailWrapper(`
    <h2 style="color: #0F172A; margin: 0 0 4px;">Nueva solicitud de reservación</h2>
    <p style="color: #64748B; font-size: 14px; margin: 0 0 24px;">${communityName} · Solicitada por ${residentName}</p>

    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #1E293B;">${areaName}</p>
      <p style="margin: 0; color: #475569; font-size: 14px;">${dateStr}</p>
      <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">${timeStr}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748B; font-size: 13px; width: 140px;">Asistentes</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #1E293B; font-size: 13px;">${reservation.attendees}</td>
      </tr>
      ${reservation.notes ? `
      <tr>
        <td style="padding: 8px 0; color: #64748B; font-size: 13px;">Notas</td>
        <td style="padding: 8px 0; color: #1E293B; font-size: 13px;">${reservation.notes}</td>
      </tr>` : ''}
    </table>

    <p style="color: #94A3B8; font-size: 13px;">Entra al panel de administración para aprobar o rechazar esta solicitud.</p>
  `)
}

export function reservationApprovedEmail(
  residentName: string,
  areaName: string,
  startTime: Date | string,
  endTime: Date | string,
): string {
  const start = new Date(startTime)
  const end   = new Date(endTime)
  const dateStr = start.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`

  return emailWrapper(`
    <h2 style="color: #0F172A; margin: 0 0 4px;">¡Reservación confirmada!</h2>
    <p style="color: #64748B; font-size: 14px; margin: 0 0 24px;">Hola ${residentName}, tu reservación fue aprobada.</p>

    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #1E293B;">${areaName}</p>
      <p style="margin: 0; color: #475569; font-size: 14px; text-transform: capitalize;">${dateStr}</p>
      <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">${timeStr}</p>
    </div>

    <p style="color: #94A3B8; font-size: 13px;">Recuerda llegar a tiempo. Si necesitas cancelar, hazlo desde la app con anticipación.</p>
  `)
}

export function reservationChargeEmail(
  residentName: string,
  areaName: string,
  startTime: Date | string,
  endTime: Date | string,
  chargeAmount: number,
  currency: string,
  chargeNote?: string | null,
): string {
  const start = new Date(startTime)
  const end   = new Date(endTime)
  const dateStr = start.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  const chargeStr = `$${chargeAmount.toLocaleString('es-MX')} ${currency}`

  return emailWrapper(`
    <h2 style="color: #0F172A; margin: 0 0 4px;">Reservación aprobada con cargo adicional</h2>
    <p style="color: #64748B; font-size: 14px; margin: 0 0 24px;">Hola ${residentName}, tu reservación fue aprobada pero tiene un cargo pendiente de pago.</p>

    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #1E293B;">${areaName}</p>
      <p style="margin: 0; color: #475569; font-size: 14px; text-transform: capitalize;">${dateStr}</p>
      <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">${timeStr}</p>
    </div>

    <div style="background: #fff7ed; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #F97316;">
      <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #9A3412; text-transform: uppercase; letter-spacing: 0.5px;">Cargo pendiente de pago</p>
      <p style="margin: 0; font-size: 24px; font-weight: 800; color: #F97316;">${chargeStr}</p>
      ${chargeNote ? `<p style="margin: 6px 0 0; color: #92400E; font-size: 13px;">${chargeNote}</p>` : ''}
    </div>

    <p style="color: #475569; font-size: 14px; margin-bottom: 8px;">Para completar tu reservación, realiza el pago desde la sección <strong>Pagos</strong> en la app antes de la fecha de uso del área.</p>
    <p style="color: #94A3B8; font-size: 13px;">Si no realizas el pago a tiempo, la reservación puede ser cancelada.</p>
  `)
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

import crypto from 'crypto'
import QRCode from 'qrcode'
import { env } from '../config/env.js'

// ============================================================
// QR Code signing — tamper-proof visitor passes
//
// The QR payload is a signed token (not JWT — simpler HMAC).
// Guard scans → verifies signature → fetches pass from DB.
// If signature fails, pass was forged → deny entry.
// ============================================================

const SECRET = env.ENCRYPTION_KEY ?? env.JWT_SECRET

interface QRPayload {
  pid: string  // passId
  cid: string  // communityId
  exp: number  // expiry unix timestamp
}

export function signQRPayload(passId: string, communityId: string, validUntil: Date): string {
  const payload: QRPayload = {
    pid: passId,
    cid: communityId,
    exp: Math.floor(validUntil.getTime() / 1000),
  }

  const data = JSON.stringify(payload)
  const encoded = Buffer.from(data).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url')

  return `${encoded}.${sig}`
}

export function verifyQRPayload(token: string): QRPayload {
  const [encoded, sig] = token.split('.')

  if (!encoded || !sig) {
    throw new Error('Invalid QR format')
  }

  const expectedSig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url')

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expectedSig)

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid QR signature — possible forgery')
  }

  const payload: QRPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString())

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('QR code has expired')
  }

  return payload
}

export async function generateQRImage(token: string): Promise<string> {
  // Returns base64 PNG — stored in DB, sent to mobile
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  })
}

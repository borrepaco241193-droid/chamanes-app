import admin from 'firebase-admin'
import { env } from '../config/env.js'

// ============================================================
// Firebase Admin SDK — singleton, initialized from env vars
// Never commit serviceAccountKey.json — use env vars instead
// ============================================================

let _app: admin.app.App | null = null

export function getFirebaseApp(): admin.app.App {
  if (_app) return _app

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new Error(
      'Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.',
    )
  }

  _app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Railway stores multiline values with literal \n — normalize them
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })

  return _app
}

export function getMessaging(): admin.messaging.Messaging {
  return getFirebaseApp().messaging()
}

export function isFirebaseConfigured(): boolean {
  return !!(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY)
}

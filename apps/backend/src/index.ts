import { buildApp } from './app.js'
import { env } from './config/env.js'

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`
  ╔═══════════════════════════════════════╗
  ║       Chamanes API — Running          ║
  ║  Port: ${env.PORT}                         ║
  ║  Env:  ${env.NODE_ENV.padEnd(11)}              ║
  ║  Docs: http://localhost:${env.PORT}/docs    ║
  ╚═══════════════════════════════════════╝
    `)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Handle unhandled rejections — crash loudly in production
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

main()

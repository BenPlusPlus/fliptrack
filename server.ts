import './load-dev-env.ts'

import * as http from 'node:http'

import { createApp } from './app/router.ts'
import { migrateAppDatabase } from './app/data/db.ts'
import { createAppRequestListener } from './app/http.ts'

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100
const hmrProxyPort = process.env.HMR_PROXY_PORT
  ? Number.parseInt(process.env.HMR_PROXY_PORT, 10)
  : null

function requiredEnv(name: string): string {
  let value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

const { router, db } = createApp({
  databaseUrl: requiredEnv('DATABASE_URL'),
  sessionSecret: requiredEnv('SESSION_SECRET'),
  setupSecret: process.env.SETUP_SECRET,
  secureCookies: process.env.NODE_ENV === 'production',
})

await migrateAppDatabase(db)

const server = http.createServer(
  createAppRequestListener(async (request) => {
    try {
      return await router.fetch(request)
    } catch (error) {
      if (!(request.signal.aborted && error === request.signal.reason)) {
        console.error(error)
      }
      return new Response('Internal Server Error', { status: 500 })
    }
  }),
)

server.listen(port, () => {
  if (process.env.REMIX_NODE_HMR) {
    import('remix/node-hmr/runtime').then((nodeHmr) => nodeHmr.emitServerReady())
  }

  console.log(`Server listening on http://localhost:${hmrProxyPort ?? port}`)
})

let shuttingDown = false

function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  server.close(() => {
    void db.close().finally(() => process.exit(0))
  })
  server.closeAllConnections()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

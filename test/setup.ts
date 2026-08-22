import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'

import EmbeddedPostgres from 'embedded-postgres'

import { createAppDatabase, migrateAppDatabase } from '../app/data/db.ts'

const INFO_PATH = path.resolve('tmp/test-postgres.json')

type PostgresInfo = {
  connectionString: string
}

let cluster: EmbeddedPostgres | undefined

export async function globalSetup() {
  await mkdir('tmp', { recursive: true })
  let port = await unusedPort()
  let databaseDir = path.resolve(`tmp/pg-${process.pid}-${port}`)

  cluster = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog() {},
    onError(message) {
      console.error(message)
    },
  })

  await cluster.initialise()
  await cluster.start()
  await cluster.createDatabase('fliptrack_test')

  let connectionString = `postgres://postgres:postgres@127.0.0.1:${port}/fliptrack_test`
  let db = createAppDatabase(connectionString)
  try {
    await migrateAppDatabase(db)
  } finally {
    await db.close()
  }

  let info: PostgresInfo = { connectionString }
  await writeFile(INFO_PATH, JSON.stringify(info), 'utf8')
  process.env.DATABASE_URL = connectionString
  process.env.SESSION_SECRET = 'test-session-secret'
  process.env.SETUP_SECRET = 'test-setup-secret'
  process.env.NODE_ENV = 'test'
}

export async function globalTeardown() {
  if (cluster) {
    await cluster.stop()
  }
}

async function unusedPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    let server = createServer()
    server.listen(0, '127.0.0.1', () => {
      let address = server.address()
      if (address == null || typeof address === 'string') {
        server.close()
        reject(new Error('Could not allocate a port'))
        return
      }
      let port = address.port
      server.close((error) => {
        if (error) reject(error)
        else resolve(port)
      })
    })
    server.on('error', reject)
  })
}

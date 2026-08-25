import './load-dev-env.ts'

import { createAppDatabase, loadAppMigrations, migrateAppDatabase } from './app/data/db.ts'

function requiredEnv(name: string): string {
  let value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

const command = process.argv[2]
const db = createAppDatabase(requiredEnv('DATABASE_URL'))

try {
  if (command === 'migrate') {
    let result = await migrateAppDatabase(db)
    if (result.applied.length === 0) {
      console.log('no pending migrations')
    }
    for (let entry of result.applied) {
      console.log('applied ' + entry.id + '_' + entry.name)
    }
  } else if (command === 'status') {
    let migrations = await loadAppMigrations()
    let entries = await db.migrationStatus(migrations)
    for (let entry of entries) {
      console.log(entry.id + ' ' + entry.name + ' ' + entry.status)
    }
  } else {
    throw new Error('Unknown database command: ' + String(command))
  }
} finally {
  await db.close()
}

import pg from 'pg'
import { createPostgresDatabase } from 'remix/data-table/postgres'
import type { Database } from 'remix/data-table'
import { loadMigrations } from 'remix/data-table/migrations/node'

// Keep Postgres `date` as YYYY-MM-DD so Acquisition date is a calendar day, not a timezone instant.
pg.types.setTypeParser(1082, (value) => value)

export type AppDatabase = Database<'postgres'>

export function createAppDatabase(connectionString: string): AppDatabase {
  return createPostgresDatabase({ connectionString })
}

export async function migrateAppDatabase(db: AppDatabase): Promise<void> {
  let migrations = await loadMigrations('./db/migrations')
  await db.migrate(migrations)
}

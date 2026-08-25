import pg from 'pg'
import { createPostgresDatabase } from 'remix/data-table/postgres'
import { sql, rawSql } from 'remix/data-table'
import type { Database, MigrateResult } from 'remix/data-table'
import type { MigrationDescriptor } from 'remix/data-table/migrations'
import { loadMigrations } from 'remix/data-table/migrations/node'

// Keep Postgres `date` as YYYY-MM-DD so Acquisition date is a calendar day, not a timezone instant.
pg.types.setTypeParser(1082, (value) => value)

const DEFAULT_JOURNAL_TABLE = 'data_table_migrations'

export type AppDatabase = Database<'postgres'>

export function createAppDatabase(connectionString: string): AppDatabase {
  return createPostgresDatabase({ connectionString })
}

function normalizeSqlNewlines(sqlText: string): string {
  return sqlText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export async function loadAppMigrations(): Promise<MigrationDescriptor[]> {
  let migrations = await loadMigrations('./db/migrations')
  return migrations.map(normalizeMigration)
}

export async function migrateAppDatabase(db: AppDatabase): Promise<MigrateResult> {
  return applyAppMigrations(db, await loadMigrations('./db/migrations'))
}

export async function applyAppMigrations(
  db: AppDatabase,
  migrations: MigrationDescriptor[],
  options: { journalTable?: string } = {},
): Promise<MigrateResult> {
  let normalized = migrations.map(normalizeMigration)
  let journalTable = options.journalTable ?? DEFAULT_JOURNAL_TABLE
  await reconcileLineEndingChecksums(db, normalized, journalTable)
  return db.migrate(normalized, { journalTable })
}

function normalizeMigration(migration: MigrationDescriptor): MigrationDescriptor {
  return {
    ...migration,
    up: normalizeSqlNewlines(migration.up),
    down: migration.down === undefined ? undefined : normalizeSqlNewlines(migration.down),
  }
}

async function sha256Hex(value: string): Promise<string> {
  let digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function journalTableIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid journal table name: ${name}`)
  }
  return name
}

// Remix journals SHA-256 of up.sql bytes. Git on Windows with autocrlf can
// store LF in the object and CRLF on disk, so the same SQL looks like drift.
async function reconcileLineEndingChecksums(
  db: AppDatabase,
  migrations: MigrationDescriptor[],
  journalTable: string,
): Promise<void> {
  let table = journalTableIdent(journalTable)
  let entries = await db.migrationStatus(migrations, { journalTable: table })
  let byId = new Map(migrations.map((migration) => [migration.id, migration]))

  for (let entry of entries) {
    if (entry.status !== 'drifted' || entry.checksum == null) {
      continue
    }

    let migration = byId.get(entry.id)
    if (!migration) {
      continue
    }

    let lfChecksum = await sha256Hex(migration.up)
    let crlfChecksum = await sha256Hex(migration.up.replace(/\n/g, '\r\n'))
    if (entry.checksum !== crlfChecksum && entry.checksum !== lfChecksum) {
      continue
    }
    if (entry.checksum === lfChecksum) {
      continue
    }

    await db.exec(sql`
      update ${rawSql(table)}
      set checksum = ${lfChecksum}
      where id = ${migration.id}
        and checksum = ${entry.checksum}
    `)
  }
}

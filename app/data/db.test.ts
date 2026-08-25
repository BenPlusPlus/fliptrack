import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'
import { rawSql, sql } from 'remix/data-table'
import type { MigrationDescriptor } from 'remix/data-table/migrations'

import { applyAppMigrations, createAppDatabase } from './db.ts'
import { readTestDatabaseUrl } from '../../test/helpers.ts'

const JOURNAL = 'line_ending_test_migrations'

function fakeMigration(up: string): MigrationDescriptor {
  return {
    id: '20990101000000',
    name: 'line_endings',
    up,
    down: 'select 1;',
  }
}

describe('migration line endings', () => {
  afterEach(async () => {
    let db = createAppDatabase(await readTestDatabaseUrl())
    try {
      await db.exec(sql`drop table if exists ${rawSql(JOURNAL)}`)
    } finally {
      await db.close()
    }
  })

  it('reconciles journal checksums when only newline bytes differ', async () => {
    let db = createAppDatabase(await readTestDatabaseUrl())
    try {
      await db.migrate([fakeMigration('select 1;\r\n')], { journalTable: JOURNAL })
      await applyAppMigrations(db, [fakeMigration('select 1;\n')], { journalTable: JOURNAL })
      let status = await db.migrationStatus([fakeMigration('select 1;\n')], {
        journalTable: JOURNAL,
      })
      assert.equal(status[0]?.status, 'applied')
    } finally {
      await db.close()
    }
  })

  it('still fails when applied SQL actually changed', async () => {
    let db = createAppDatabase(await readTestDatabaseUrl())
    try {
      await db.migrate([fakeMigration('select 1;\n')], { journalTable: JOURNAL })
      await assert.rejects(
        () => applyAppMigrations(db, [fakeMigration('select 2;\n')], { journalTable: JOURNAL }),
        /checksum drift/,
      )
    } finally {
      await db.close()
    }
  })
})

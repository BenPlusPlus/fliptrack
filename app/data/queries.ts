import { sql } from 'remix/data-table'

import type { AppDatabase } from './db.ts'
import { acquisitions, books, flips, operators } from './schema.ts'
import type { Acquisition, Flip, Operator } from './schema.ts'
import { allocateShares } from '../utils/cents.ts'

export async function countOperators(db: AppDatabase): Promise<number> {
  return db.count(operators)
}

export async function findOperatorByEmail(
  db: AppDatabase,
  email: string,
): Promise<Operator | null> {
  let result = await db.exec(sql`
    select *
    from operator
    where lower(email) = lower(${email})
    limit 1
  `)
  return (result.rows?.[0] as Operator | undefined) ?? null
}

export async function findOperatorById(db: AppDatabase, id: string): Promise<Operator | null> {
  return db.find(operators, id)
}

export async function findInstanceAdmin(db: AppDatabase): Promise<Operator | null> {
  return db.findOne(operators, { where: { instance_admin: true } })
}

export async function createInstanceAdmin(
  db: AppDatabase,
  input: { email: string; passwordHash: string },
): Promise<Operator> {
  return db.transaction(async (tx) => {
    let booksId = crypto.randomUUID()
    await tx.create(books, { id: booksId })
    return tx.create(
      operators,
      {
        id: crypto.randomUUID(),
        email: input.email,
        password_hash: input.passwordHash,
        instance_admin: true,
        must_change_password: false,
        credentials_changed_at: new Date(),
        books_id: booksId,
      },
      { returnRow: true },
    )
  })
}

export async function replaceInstanceAdminPassword(
  db: AppDatabase,
  operatorId: string,
  passwordHash: string,
): Promise<Operator> {
  return db.update(operators, operatorId, {
    password_hash: passwordHash,
    credentials_changed_at: new Date(),
    must_change_password: false,
  })
}

export async function createAcquisition(
  db: AppDatabase,
  input: { booksId: string; acquisitionDate: string; notes?: string },
): Promise<Acquisition> {
  let created = await db.create(
    acquisitions,
    {
      id: crypto.randomUUID(),
      books_id: input.booksId,
      acquisition_date: input.acquisitionDate,
      ...(input.notes ? { notes: input.notes } : {}),
    },
    { returnRow: true },
  )
  return created as Acquisition
}

export async function findAcquisitionInBooks(
  db: AppDatabase,
  input: { acquisitionId: string; booksId: string },
): Promise<Acquisition | null> {
  return db.findOne(acquisitions, {
    where: { id: input.acquisitionId, books_id: input.booksId },
  })
}

export async function addFlipAndSnapshotSitting(
  db: AppDatabase,
  input: {
    booksId: string
    acquisitionId: string
    name: string
    notes?: string
    itemCost: number
    sitting?: { taxPaid: number; inboundShipping: number }
  },
): Promise<Flip> {
  return db.transaction(async (tx) => {
    let created = (await tx.create(
      flips,
      {
        id: crypto.randomUUID(),
        books_id: input.booksId,
        acquisition_id: input.acquisitionId,
        name: input.name,
        ...(input.notes ? { notes: input.notes } : {}),
        item_cost: input.itemCost,
        tax_paid: 0,
        inbound_shipping: 0,
      },
      { returnRow: true },
    )) as Flip

    if (!input.sitting) {
      return created
    }

    let sittingFlips = await tx.findMany(flips, {
      where: { acquisition_id: input.acquisitionId, books_id: input.booksId },
      orderBy: ['id', 'asc'],
    })

    let weights = sittingFlips.map((flip) => flip.item_cost)
    let taxShares = allocateShares(input.sitting.taxPaid, weights)
    let shippingShares = allocateShares(input.sitting.inboundShipping, weights)

    for (let index = 0; index < sittingFlips.length; index += 1) {
      await tx.update(flips, sittingFlips[index]!.id, {
        tax_paid: taxShares[index],
        inbound_shipping: shippingShares[index],
      })
    }

    return (await tx.find(flips, created.id)) ?? created
  })
}

export async function listInventory(db: AppDatabase, booksId: string): Promise<Flip[]> {
  let result = await db.exec(sql`
    select flip.*
    from flip
    join acquisition on acquisition.id = flip.acquisition_id
    where flip.books_id = ${booksId}
    order by acquisition.acquisition_date desc, flip.name asc
  `)
  return (result.rows ?? []) as Flip[]
}

export async function inventoryAcquisitionCostCents(
  db: AppDatabase,
  booksId: string,
): Promise<number> {
  let result = await db.exec(sql`
    select coalesce(sum(item_cost + tax_paid + inbound_shipping), 0)::int as total
    from flip
    where books_id = ${booksId}
  `)
  return Number(result.rows?.[0]?.total ?? 0)
}

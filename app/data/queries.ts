import { sql } from 'remix/data-table'

import type { AppDatabase } from './db.ts'
import { acquisitions, books, flipTags, flips, operators, tags } from './schema.ts'
import type { Acquisition, Flip, Operator, Tag } from './schema.ts'
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

export async function replaceAcquisitionFacts(
  db: AppDatabase,
  input: {
    acquisitionId: string
    booksId: string
    acquisitionDate: string
    notes?: string
  },
): Promise<Acquisition | null> {
  let existing = await findAcquisitionInBooks(db, {
    acquisitionId: input.acquisitionId,
    booksId: input.booksId,
  })
  if (!existing) {
    return null
  }
  return db.update(acquisitions, input.acquisitionId, {
    acquisition_date: input.acquisitionDate,
    notes: input.notes,
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
    sitting?: { taxPaid: number; inboundShipping: number; flipIds: string[] }
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
        retired: false,
        item_cost: input.itemCost,
        tax_paid: 0,
        inbound_shipping: 0,
      },
      { returnRow: true },
    )) as Flip

    if (!input.sitting) {
      return created
    }

    let sittingFlips: Flip[] = []
    for (let flipId of [...input.sitting.flipIds, created.id]) {
      let row = await tx.find(flips, flipId)
      if (row && row.books_id === input.booksId && row.acquisition_id === input.acquisitionId) {
        sittingFlips.push(row)
      }
    }
    sittingFlips.sort((a, b) => a.id.localeCompare(b.id))

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

export async function findFlipInBooks(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<Flip | null> {
  return db.findOne(flips, {
    where: { id: input.flipId, books_id: input.booksId },
  })
}

export async function replaceFlipFacts(
  db: AppDatabase,
  input: {
    flipId: string
    booksId: string
    name: string
    notes?: string
    itemCost: number
    taxPaid: number
    inboundShipping: number
  },
): Promise<Flip | null> {
  let existing = await findFlipInBooks(db, { flipId: input.flipId, booksId: input.booksId })
  if (!existing) {
    return null
  }
  if (existing.retired) {
    return db.update(flips, input.flipId, {
      name: input.name,
      notes: input.notes,
    })
  }
  return db.update(flips, input.flipId, {
    name: input.name,
    notes: input.notes,
    item_cost: input.itemCost,
    tax_paid: input.taxPaid,
    inbound_shipping: input.inboundShipping,
  })
}

export type InventoryFilter = {
  name?: string
  tagIds?: string[]
  untagged?: boolean
}

export async function listInventory(
  db: AppDatabase,
  booksId: string,
  filter: InventoryFilter = {},
): Promise<Flip[]> {
  let result = await db.exec(sql`
    select flip.*
    from flip
    join acquisition on acquisition.id = flip.acquisition_id
    where flip.books_id = ${booksId}
      and flip.retired = false
    order by acquisition.acquisition_date desc, flip.name asc
  `)
  let rows = (result.rows ?? []) as Flip[]

  let name = filter.name?.trim().toLowerCase() ?? ''
  if (name !== '') {
    rows = rows.filter((flip) => flip.name.toLowerCase().includes(name))
  }

  if (filter.untagged) {
    let tagged = await db.exec(sql`
      select distinct flip_id
      from flip_tag
      where books_id = ${booksId}
    `)
    let taggedIds = new Set((tagged.rows ?? []).map((row) => String(row.flip_id)))
    return rows.filter((flip) => !taggedIds.has(flip.id))
  }

  let tagIds = [...new Set((filter.tagIds ?? []).filter(Boolean))]
  if (tagIds.length === 0) {
    return rows
  }

  let membership = await db.exec(sql`
    select flip_id, tag_id
    from flip_tag
    where books_id = ${booksId}
  `)
  let tagsByFlip = new Map<string, Set<string>>()
  for (let row of membership.rows ?? []) {
    let flipId = String(row.flip_id)
    let set = tagsByFlip.get(flipId) ?? new Set<string>()
    set.add(String(row.tag_id))
    tagsByFlip.set(flipId, set)
  }

  return rows.filter((flip) => {
    let have = tagsByFlip.get(flip.id)
    return tagIds.every((tagId) => have?.has(tagId))
  })
}

export async function inventoryAcquisitionCostCents(
  db: AppDatabase,
  booksId: string,
): Promise<number> {
  let result = await db.exec(sql`
    select coalesce(sum(item_cost + tax_paid + inbound_shipping), 0)::int as total
    from flip
    where books_id = ${booksId}
      and retired = false
  `)
  return Number(result.rows?.[0]?.total ?? 0)
}

export async function listTagsInBooks(db: AppDatabase, booksId: string): Promise<Tag[]> {
  return db.findMany(tags, { where: { books_id: booksId }, orderBy: ['name', 'asc'] })
}

export async function listTagsForFlip(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<Tag[]> {
  let result = await db.exec(sql`
    select tag.*
    from tag
    join flip_tag on flip_tag.tag_id = tag.id
    where flip_tag.flip_id = ${input.flipId}
      and flip_tag.books_id = ${input.booksId}
    order by tag.name asc
  `)
  return (result.rows ?? []) as Tag[]
}

export async function loadFlipHub(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
) {
  let flip = await findFlipInBooks(db, input)
  if (!flip) {
    return null
  }
  let acquisition = await findAcquisitionInBooks(db, {
    acquisitionId: flip.acquisition_id,
    booksId: input.booksId,
  })
  if (!acquisition) {
    return null
  }
  let [flipTagsForFlip, bookTags, parent] = await Promise.all([
    listTagsForFlip(db, input),
    listTagsInBooks(db, input.booksId),
    flip.parent_flip_id
      ? findFlipInBooks(db, { flipId: flip.parent_flip_id, booksId: input.booksId })
      : Promise.resolve(null),
  ])
  return { flip, acquisition, tags: flipTagsForFlip, bookTags, parent }
}

export type ResplitChild = { name: string; itemCost: number }

export async function resplitFlip(
  db: AppDatabase,
  input: { parentId: string; booksId: string; children: ResplitChild[] },
): Promise<{ ok: true; children: Flip[] } | { ok: false; error: string }> {
  return db.transaction(async (tx) => {
    let parent = await findFlipInBooks(tx, { flipId: input.parentId, booksId: input.booksId })
    if (!parent) {
      return { ok: false, error: 'Not Found' }
    }
    if (parent.retired) {
      return { ok: false, error: 'A Retired Flip cannot be re-split.' }
    }
    if (input.children.length < 2) {
      return { ok: false, error: 'Re-split needs at least two children.' }
    }
    let itemSum = input.children.reduce((sum, child) => sum + child.itemCost, 0)
    if (itemSum !== parent.item_cost) {
      return { ok: false, error: 'Item costs must sum to the parent.' }
    }

    let weights = input.children.map((child) => child.itemCost)
    let taxShares = allocateShares(parent.tax_paid, weights)
    let shippingShares = allocateShares(parent.inbound_shipping, weights)
    let parentTags = await listTagsForFlip(tx, {
      flipId: parent.id,
      booksId: input.booksId,
    })

    let created: Flip[] = []
    for (let index = 0; index < input.children.length; index += 1) {
      let child = input.children[index]!
      let row = (await tx.create(
        flips,
        {
          id: crypto.randomUUID(),
          books_id: input.booksId,
          acquisition_id: parent.acquisition_id,
          parent_flip_id: parent.id,
          retired: false,
          name: child.name,
          item_cost: child.itemCost,
          tax_paid: taxShares[index]!,
          inbound_shipping: shippingShares[index]!,
        },
        { returnRow: true },
      )) as Flip
      for (let tag of parentTags) {
        await tx.create(flipTags, {
          books_id: input.booksId,
          flip_id: row.id,
          tag_id: tag.id,
        })
      }
      created.push(row)
    }

    await tx.update(flips, parent.id, { retired: true })
    return { ok: true, children: created }
  })
}

export async function unusedFlipMayBeRemoved(
  db: AppDatabase,
  flip: Flip,
): Promise<boolean> {
  if (flip.retired) {
    return false
  }
  // Later slices: never on a Listing, Sale, or Write-off, including Undone.
  void db
  return true
}

export async function findTagInBooks(
  db: AppDatabase,
  input: { tagId: string; booksId: string },
): Promise<Tag | null> {
  return db.findOne(tags, { where: { id: input.tagId, books_id: input.booksId } })
}

export async function removeUnusedFlip(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    let flip = await findFlipInBooks(tx, { flipId: input.flipId, booksId: input.booksId })
    if (!flip) {
      return { ok: false, error: 'Not Found', status: 404 }
    }
    if (!(await unusedFlipMayBeRemoved(tx, flip))) {
      return { ok: false, error: 'This Flip cannot be removed.', status: 400 }
    }

    await tx.exec(sql`
      delete from flip_tag
      where flip_id = ${flip.id}
        and books_id = ${input.booksId}
    `)
    await tx.delete(flips, flip.id)

    let remaining = await tx.exec(sql`
      select 1
      from flip
      where acquisition_id = ${flip.acquisition_id}
        and books_id = ${input.booksId}
      limit 1
    `)
    if ((remaining.rows?.length ?? 0) === 0) {
      await tx.delete(acquisitions, flip.acquisition_id)
    }

    return { ok: true }
  })
}

export async function renameTag(
  db: AppDatabase,
  input: { tagId: string; booksId: string; name: string },
): Promise<{ ok: true; tag: Tag } | { ok: false; error: string; status: number }> {
  let tag = await db.findOne(tags, { where: { id: input.tagId, books_id: input.booksId } })
  if (!tag) {
    return { ok: false, error: 'Not Found', status: 404 }
  }
  let clash = await db.exec(sql`
    select id
    from tag
    where books_id = ${input.booksId}
      and lower(name) = lower(${input.name})
      and id <> ${tag.id}
    limit 1
  `)
  if ((clash.rows?.length ?? 0) > 0) {
    return { ok: false, error: 'Tag names are unique in the Books.', status: 400 }
  }
  let updated = await db.update(tags, tag.id, { name: input.name })
  return { ok: true, tag: updated as Tag }
}

export async function deleteTag(
  db: AppDatabase,
  input: { tagId: string; booksId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  let tag = await db.findOne(tags, { where: { id: input.tagId, books_id: input.booksId } })
  if (!tag) {
    return { ok: false, error: 'Not Found', status: 404 }
  }
  await db.delete(tags, tag.id)
  return { ok: true }
}

export async function detachTagFromFlip(
  db: AppDatabase,
  input: { flipId: string; tagId: string; booksId: string },
): Promise<boolean> {
  let flip = await findFlipInBooks(db, { flipId: input.flipId, booksId: input.booksId })
  if (!flip) {
    return false
  }
  await db.exec(sql`
    delete from flip_tag
    where flip_id = ${input.flipId}
      and tag_id = ${input.tagId}
      and books_id = ${input.booksId}
  `)
  return true
}

export async function attachNamedTagToFlip(
  db: AppDatabase,
  input: { flipId: string; booksId: string; name: string },
): Promise<Tag | null> {
  let flip = await findFlipInBooks(db, { flipId: input.flipId, booksId: input.booksId })
  if (!flip) {
    return null
  }

  return db.transaction(async (tx) => {
    let found = await tx.exec(sql`
      select *
      from tag
      where books_id = ${input.booksId}
        and lower(name) = lower(${input.name})
      limit 1
    `)
    let tag = (found.rows?.[0] as Tag | undefined) ?? null
    if (!tag) {
      tag = (await tx.create(
        tags,
        {
          id: crypto.randomUUID(),
          books_id: input.booksId,
          name: input.name,
        },
        { returnRow: true },
      )) as Tag
    }

    let attached = await tx.exec(sql`
      select 1
      from flip_tag
      where flip_id = ${input.flipId}
        and tag_id = ${tag.id}
      limit 1
    `)
    if ((attached.rows?.length ?? 0) === 0) {
      await tx.create(flipTags, {
        books_id: input.booksId,
        flip_id: input.flipId,
        tag_id: tag.id,
      })
    }
    return tag
  })
}

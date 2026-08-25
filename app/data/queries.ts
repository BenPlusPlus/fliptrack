import { sql } from 'remix/data-table'

import type { AppDatabase } from './db.ts'
import {
  acquisitions,
  books,
  channels,
  flipTags,
  flips,
  listingFlips,
  listings,
  operators,
  saleFlips,
  sales,
  tags,
  writeOffFlips,
  writeOffs,
} from './schema.ts'
import type {
  Acquisition,
  Channel,
  Flip,
  Listing,
  Operator,
  Sale,
  Tag,
  WriteOff,
} from './schema.ts'
import { allocateShares } from '../utils/cents.ts'
import {
  dateInWindow,
  type ProfitWindowKind,
} from '../utils/calendar.ts'

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
  if (existing.retired || (await flipHasStandingRealizing(db, existing.id))) {
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
      and not exists (
        select 1
        from sale_flip
        where sale_flip.flip_id = flip.id
          and sale_flip.undone = false
      )
      and not exists (
        select 1
        from write_off_flip
        where write_off_flip.flip_id = flip.id
          and write_off_flip.undone = false
      )
    order by acquisition.acquisition_date desc, flip.name asc
  `)
  return applyFlipFilters(db, booksId, (result.rows ?? []) as Flip[], filter)
}

export async function listSold(
  db: AppDatabase,
  booksId: string,
  filter: InventoryFilter = {},
): Promise<Flip[]> {
  let result = await db.exec(sql`
    select flip.*
    from flip
    join acquisition on acquisition.id = flip.acquisition_id
    join sale_flip on sale_flip.flip_id = flip.id and sale_flip.undone = false
    join sale on sale.id = sale_flip.sale_id
    where flip.books_id = ${booksId}
      and flip.retired = false
    order by sale.sale_date desc, flip.name asc
  `)
  return applyFlipFilters(db, booksId, (result.rows ?? []) as Flip[], filter)
}

export async function listWrittenOff(
  db: AppDatabase,
  booksId: string,
  filter: InventoryFilter = {},
): Promise<Flip[]> {
  let result = await db.exec(sql`
    select flip.*
    from flip
    join acquisition on acquisition.id = flip.acquisition_id
    join write_off_flip on write_off_flip.flip_id = flip.id and write_off_flip.undone = false
    join write_off on write_off.id = write_off_flip.write_off_id
    where flip.books_id = ${booksId}
      and flip.retired = false
    order by write_off.write_off_date desc, flip.name asc
  `)
  return applyFlipFilters(db, booksId, (result.rows ?? []) as Flip[], filter)
}

async function applyFlipFilters(
  db: AppDatabase,
  booksId: string,
  rows: Flip[],
  filter: InventoryFilter,
): Promise<Flip[]> {
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
  let [flipTagsForFlip, bookTags, parent, standingSale, standingWriteOff] = await Promise.all([
    listTagsForFlip(db, input),
    listTagsInBooks(db, input.booksId),
    flip.parent_flip_id
      ? findFlipInBooks(db, { flipId: flip.parent_flip_id, booksId: input.booksId })
      : Promise.resolve(null),
    loadStandingSaleForFlip(db, input),
    loadStandingWriteOffForFlip(db, input),
  ])
  let standing = standingSale ?? standingWriteOff
  let inboundFrozen = flip.retired || standing != null
  let [mayRemove, hasLiveListing, hitch, undoneEvents] = await Promise.all([
    unusedFlipMayBeRemoved(db, flip),
    flipHasLiveListing(db, flip.id),
    hitchByFlipId(db, input.booksId),
    listUndoneEventsForFlip(db, input),
  ])
  let isInventory = !flip.retired && standing == null
  return {
    flip,
    acquisition,
    tags: flipTagsForFlip,
    bookTags,
    parent,
    standing,
    hitchCents: hitch.get(flip.id) ?? 0,
    undoneEvents,
    inboundFrozen,
    mayRemove,
    isInventory,
    mayResplit: isInventory && !hasLiveListing,
    mayWriteOff: isInventory && !hasLiveListing,
  }
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
    if (await flipHasStandingSale(tx, parent.id)) {
      return { ok: false, error: 'A Flip with a standing Sale cannot be re-split.' }
    }
    if (await flipHasStandingWriteOff(tx, parent.id)) {
      return { ok: false, error: 'A Flip with a standing Write-off cannot be re-split.' }
    }
    if (await flipHasLiveListing(tx, parent.id)) {
      return { ok: false, error: 'A live Listing blocks Re-split. End the Listing first.' }
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
  let result = await db.exec(sql`
    select 1
    from sale_flip
    where flip_id = ${flip.id}
    union all
    select 1
    from write_off_flip
    where flip_id = ${flip.id}
    limit 1
  `)
  if ((result.rows?.length ?? 0) > 0) {
    return false
  }
  return !(await flipHasListingMembership(db, flip.id))
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
    if (await flipHasListingMembership(tx, flip.id)) {
      return { ok: false, error: 'A Flip on a Listing cannot be removed.', status: 400 }
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

export function acquisitionCostCents(flip: {
  item_cost: number
  tax_paid: number
  inbound_shipping: number
}): number {
  return flip.item_cost + flip.tax_paid + flip.inbound_shipping
}

export async function flipHasStandingSale(db: AppDatabase, flipId: string): Promise<boolean> {
  let result = await db.exec(sql`
    select 1
    from sale_flip
    where flip_id = ${flipId}
      and undone = false
    limit 1
  `)
  return (result.rows?.length ?? 0) > 0
}

export async function flipHasStandingWriteOff(db: AppDatabase, flipId: string): Promise<boolean> {
  let result = await db.exec(sql`
    select 1
    from write_off_flip
    where flip_id = ${flipId}
      and undone = false
    limit 1
  `)
  return (result.rows?.length ?? 0) > 0
}

export async function flipHasStandingRealizing(db: AppDatabase, flipId: string): Promise<boolean> {
  return (await flipHasStandingSale(db, flipId)) || (await flipHasStandingWriteOff(db, flipId))
}

export async function listChannelsInBooks(db: AppDatabase, booksId: string): Promise<Channel[]> {
  return db.findMany(channels, { where: { books_id: booksId }, orderBy: ['name', 'asc'] })
}

export async function findChannelInBooks(
  db: AppDatabase,
  input: { channelId: string; booksId: string },
): Promise<Channel | null> {
  return db.findOne(channels, { where: { id: input.channelId, books_id: input.booksId } })
}

export async function findOrCreateChannelByName(
  db: AppDatabase,
  input: { booksId: string; name: string },
): Promise<Channel> {
  let found = await db.exec(sql`
    select *
    from channel
    where books_id = ${input.booksId}
      and lower(name) = lower(${input.name})
    limit 1
  `)
  let existing = (found.rows?.[0] as Channel | undefined) ?? null
  if (existing) {
    return existing
  }
  return (await db.create(
    channels,
    {
      id: crypto.randomUUID(),
      books_id: input.booksId,
      name: input.name,
    },
    { returnRow: true },
  )) as Channel
}

export async function renameChannel(
  db: AppDatabase,
  input: { channelId: string; booksId: string; name: string },
): Promise<{ ok: true; channel: Channel } | { ok: false; error: string; status: number }> {
  let channel = await findChannelInBooks(db, input)
  if (!channel) {
    return { ok: false, error: 'Not Found', status: 404 }
  }
  let clash = await db.exec(sql`
    select id
    from channel
    where books_id = ${input.booksId}
      and lower(name) = lower(${input.name})
      and id <> ${channel.id}
    limit 1
  `)
  if ((clash.rows?.length ?? 0) > 0) {
    return { ok: false, error: 'Channel names are unique in the Books.', status: 400 }
  }
  let updated = await db.update(channels, channel.id, { name: input.name })
  return { ok: true, channel: updated as Channel }
}

export async function deleteChannel(
  db: AppDatabase,
  input: { channelId: string; booksId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  let channel = await findChannelInBooks(db, input)
  if (!channel) {
    return { ok: false, error: 'Not Found', status: 404 }
  }
  let referenced = await db.exec(sql`
    select 1
    from sale
    where channel_id = ${channel.id}
    limit 1
  `)
  if ((referenced.rows?.length ?? 0) > 0) {
    return {
      ok: false,
      error: 'This Channel cannot be deleted while a Sale references it.',
      status: 400,
    }
  }
  await db.delete(channels, channel.id)
  return { ok: true }
}

export async function findSaleInBooks(
  db: AppDatabase,
  input: { saleId: string; booksId: string },
): Promise<Sale | null> {
  return db.findOne(sales, { where: { id: input.saleId, books_id: input.booksId } })
}

export type KitFlip = {
  flip: Flip
  acquisitionCostCents: number
}

export async function loadKitFlips(
  db: AppDatabase,
  input: {
    booksId: string
    flipIds: string[]
    emptyError?: string
    notInventoryError?: string
    requireNoLiveListing?: boolean
    liveListingError?: string
  },
): Promise<{ ok: true; kit: KitFlip[] } | { ok: false; error: string; status: number }> {
  let uniqueIds = [...new Set(input.flipIds.filter(Boolean))]
  if (uniqueIds.length === 0) {
    return { ok: false, error: input.emptyError ?? 'Pick Inventory Flips to sell.', status: 400 }
  }

  let kit: KitFlip[] = []
  for (let flipId of uniqueIds) {
    let flip = await findFlipInBooks(db, { flipId, booksId: input.booksId })
    if (!flip) {
      return { ok: false, error: 'Not Found', status: 404 }
    }
    if (flip.retired || (await flipHasStandingRealizing(db, flip.id))) {
      return {
        ok: false,
        error: input.notInventoryError ?? 'Sold from Inventory Flips only.',
        status: 400,
      }
    }
    if (input.requireNoLiveListing && (await flipHasLiveListing(db, flip.id))) {
      return {
        ok: false,
        error: input.liveListingError ?? 'A live Listing blocks Write-off. End the Listing first.',
        status: 400,
      }
    }
    kit.push({ flip, acquisitionCostCents: acquisitionCostCents(flip) })
  }
  kit.sort((a, b) => a.flip.name.localeCompare(b.flip.name) || a.flip.id.localeCompare(b.flip.id))
  return { ok: true, kit }
}

export async function findListingInBooks(
  db: AppDatabase,
  input: { listingId: string; booksId: string },
): Promise<Listing | null> {
  return db.findOne(listings, { where: { id: input.listingId, books_id: input.booksId } })
}

export async function flipHasListingMembership(db: AppDatabase, flipId: string): Promise<boolean> {
  let result = await db.exec(sql`
    select 1
    from listing_flip
    where flip_id = ${flipId}
    limit 1
  `)
  return (result.rows?.length ?? 0) > 0
}

export async function flipHasLiveListing(db: AppDatabase, flipId: string): Promise<boolean> {
  let result = await db.exec(sql`
    select 1
    from listing_flip
    join listing on listing.id = listing_flip.listing_id
    where listing_flip.flip_id = ${flipId}
      and listing.ended = false
    limit 1
  `)
  return (result.rows?.length ?? 0) > 0
}

export async function listingSpendIsFrozen(db: AppDatabase, listingId: string): Promise<boolean> {
  let result = await db.exec(sql`
    select 1
    from listing_flip
    where listing_flip.listing_id = ${listingId}
      and (
        exists (
          select 1
          from sale_flip
          where sale_flip.flip_id = listing_flip.flip_id
            and sale_flip.undone = false
        )
        or exists (
          select 1
          from write_off_flip
          where write_off_flip.flip_id = listing_flip.flip_id
            and write_off_flip.undone = false
        )
      )
    limit 1
  `)
  return (result.rows?.length ?? 0) > 0
}

export function formatListingTitle(names: string[]): string {
  let sorted = [...names].sort((a, b) => a.localeCompare(b))
  if (sorted.length === 0) {
    return 'Listing'
  }
  if (sorted.length <= 3) {
    return sorted.join(', ')
  }
  return `${sorted.slice(0, 3).join(', ')}, and ${sorted.length - 3} more`
}

export type ListingIndexRow = {
  listing: Listing
  title: string
  live: boolean
}

export async function listListingsInBooks(
  db: AppDatabase,
  booksId: string,
): Promise<ListingIndexRow[]> {
  let rows = await db.findMany(listings, { where: { books_id: booksId } })
  rows.sort((a, b) => Number(a.ended) - Number(b.ended) || a.id.localeCompare(b.id))

  let membership = await db.exec(sql`
    select listing_flip.listing_id, flip.name
    from listing_flip
    join flip on flip.id = listing_flip.flip_id
    where listing_flip.books_id = ${booksId}
    order by flip.name asc
  `)
  let namesByListing = new Map<string, string[]>()
  for (let row of membership.rows ?? []) {
    let listingId = String(row.listing_id)
    let names = namesByListing.get(listingId) ?? []
    names.push(String(row.name))
    namesByListing.set(listingId, names)
  }

  return rows.map((listing) => ({
    listing,
    title: formatListingTitle(namesByListing.get(listing.id) ?? []),
    live: !listing.ended,
  }))
}

export async function listListingFlips(
  db: AppDatabase,
  input: { listingId: string; booksId: string },
): Promise<Flip[]> {
  let result = await db.exec(sql`
    select flip.*
    from flip
    join listing_flip on listing_flip.flip_id = flip.id
    where listing_flip.listing_id = ${input.listingId}
      and listing_flip.books_id = ${input.booksId}
    order by flip.name asc, flip.id asc
  `)
  return (result.rows ?? []) as Flip[]
}

export type ListingHub = {
  listing: Listing
  title: string
  flips: Flip[]
  spendFrozen: boolean
  remainingInventory: Flip[]
  ended: boolean
}

export async function loadListingHub(
  db: AppDatabase,
  input: { listingId: string; booksId: string },
): Promise<ListingHub | null> {
  let listing = await findListingInBooks(db, input)
  if (!listing) {
    return null
  }
  let members = await listListingFlips(db, input)
  let remainingInventory: Flip[] = []
  for (let flip of members) {
    if (!flip.retired && !(await flipHasStandingRealizing(db, flip.id))) {
      remainingInventory.push(flip)
    }
  }
  return {
    listing,
    title: formatListingTitle(members.map((flip) => flip.name)),
    flips: members,
    spendFrozen: await listingSpendIsFrozen(db, listing.id),
    remainingInventory,
    ended: listing.ended,
  }
}

export type CreateListingInput = {
  booksId: string
  flipIds: string[]
  listingSpend: number
  notes?: string
}

export async function createListing(
  db: AppDatabase,
  input: CreateListingInput,
): Promise<{ ok: true; listing: Listing } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    let kit = await loadKitFlips(tx, {
      booksId: input.booksId,
      flipIds: input.flipIds,
      emptyError: 'Pick Inventory Flips for a Listing.',
    })
    if (!kit.ok) {
      return kit
    }
    let listing = (await tx.create(
      listings,
      {
        id: crypto.randomUUID(),
        books_id: input.booksId,
        listing_spend: input.listingSpend,
        ended: false,
        ...(input.notes ? { notes: input.notes } : {}),
      },
      { returnRow: true },
    )) as Listing
    for (let row of kit.kit) {
      await tx.create(listingFlips, {
        books_id: input.booksId,
        listing_id: listing.id,
        flip_id: row.flip.id,
      })
    }
    return { ok: true as const, listing }
  })
}

export async function replaceListingFacts(
  db: AppDatabase,
  input: { listingId: string; booksId: string; listingSpend: number; notes?: string },
): Promise<{ ok: true; listing: Listing } | { ok: false; error: string; status: number }> {
  let listing = await findListingInBooks(db, input)
  if (!listing) {
    return { ok: false, error: 'Not Found', status: 404 }
  }
  let frozen = await listingSpendIsFrozen(db, listing.id)
  let updated = (await db.update(listings, listing.id, {
    notes: input.notes,
    ...(frozen ? {} : { listing_spend: input.listingSpend }),
  })) as Listing
  return { ok: true as const, listing: updated }
}

export async function endListing(
  db: AppDatabase,
  input: { listingId: string; booksId: string },
): Promise<{ ok: true; listing: Listing } | { ok: false; error: string; status: number }> {
  let listing = await findListingInBooks(db, input)
  if (!listing) {
    return { ok: false, error: 'Not Found', status: 404 }
  }
  if (listing.ended) {
    return { ok: true as const, listing }
  }
  let updated = (await db.update(listings, listing.id, { ended: true })) as Listing
  return { ok: true as const, listing: updated }
}

async function endSoldOutListings(db: AppDatabase, booksId: string): Promise<void> {
  await db.exec(sql`
    update listing
    set ended = true
    where books_id = ${booksId}
      and ended = false
      and not exists (
        select 1
        from listing_flip
        join flip on flip.id = listing_flip.flip_id
        where listing_flip.listing_id = listing.id
          and flip.retired = false
          and not exists (
            select 1
            from sale_flip
            where sale_flip.flip_id = flip.id
              and sale_flip.undone = false
          )
          and not exists (
            select 1
            from write_off_flip
            where write_off_flip.flip_id = flip.id
              and write_off_flip.undone = false
          )
      )
  `)
}

export async function listingSpendByFlipId(
  db: AppDatabase,
  booksId: string,
): Promise<Map<string, number>> {
  let flipRows = await db.exec(sql`
    select *
    from flip
    where books_id = ${booksId}
  `)
  let allFlips = (flipRows.rows ?? []) as Flip[]
  let flipsById = new Map(allFlips.map((flip) => [flip.id, flip]))

  let membership = await db.exec(sql`
    select listing.id as listing_id, listing.listing_spend, listing_flip.flip_id
    from listing
    join listing_flip on listing_flip.listing_id = listing.id
    where listing.books_id = ${booksId}
  `)

  type ListingGroup = { spend: number; flipIds: string[] }
  let groups = new Map<string, ListingGroup>()
  for (let row of membership.rows ?? []) {
    let listingId = String(row.listing_id)
    let group = groups.get(listingId)
    if (!group) {
      group = { spend: Number(row.listing_spend), flipIds: [] }
      groups.set(listingId, group)
    }
    group.flipIds.push(String(row.flip_id))
  }

  let spendByFlip = new Map<string, number>()
  function addSpend(flipId: string, cents: number) {
    spendByFlip.set(flipId, (spendByFlip.get(flipId) ?? 0) + cents)
  }

  for (let group of groups.values()) {
    let members = group.flipIds
      .map((flipId) => flipsById.get(flipId))
      .filter((flip): flip is Flip => flip != null)
      .sort((a, b) => a.id.localeCompare(b.id))
    if (members.length === 0) {
      continue
    }
    let memberShares = allocateShares(
      group.spend,
      members.map((flip) => acquisitionCostCents(flip)),
    )
    for (let index = 0; index < members.length; index += 1) {
      let member = members[index]!
      let share = memberShares[index]!
      if (!member.retired) {
        addSpend(member.id, share)
        continue
      }
      let descendants = nonRetiredDescendants(member.id, allFlips, flipsById)
      if (descendants.length === 0) {
        continue
      }
      descendants.sort((a, b) => a.id.localeCompare(b.id))
      let childShares = allocateShares(
        share,
        descendants.map((flip) => acquisitionCostCents(flip)),
      )
      for (let childIndex = 0; childIndex < descendants.length; childIndex += 1) {
        addSpend(descendants[childIndex]!.id, childShares[childIndex]!)
      }
    }
  }

  return spendByFlip
}

export async function hitchByFlipId(
  db: AppDatabase,
  booksId: string,
): Promise<Map<string, number>> {
  let flipRows = await db.exec(sql`
    select *
    from flip
    where books_id = ${booksId}
  `)
  let allFlips = (flipRows.rows ?? []) as Flip[]
  let flipsById = new Map(allFlips.map((flip) => [flip.id, flip]))

  let hitchRows = await db.exec(sql`
    select flip_id, hitch_marketplace_fee, hitch_outbound_shipping, hitch_supplies
    from sale_flip
    where books_id = ${booksId}
      and undone = true
    union all
    select flip_id, hitch_marketplace_fee, hitch_outbound_shipping, hitch_supplies
    from write_off_flip
    where books_id = ${booksId}
      and undone = true
  `)

  let hitchOnFlip = new Map<string, number>()
  for (let row of hitchRows.rows ?? []) {
    let flipId = String(row.flip_id)
    let cents =
      Number(row.hitch_marketplace_fee ?? 0) +
      Number(row.hitch_outbound_shipping ?? 0) +
      Number(row.hitch_supplies ?? 0)
    hitchOnFlip.set(flipId, (hitchOnFlip.get(flipId) ?? 0) + cents)
  }

  let hitchByFlip = new Map<string, number>()
  function addHitch(flipId: string, cents: number) {
    hitchByFlip.set(flipId, (hitchByFlip.get(flipId) ?? 0) + cents)
  }

  for (let [flipId, cents] of hitchOnFlip) {
    let flip = flipsById.get(flipId)
    if (!flip) {
      continue
    }
    if (!flip.retired) {
      addHitch(flipId, cents)
      continue
    }
    let descendants = nonRetiredDescendants(flip.id, allFlips, flipsById)
    if (descendants.length === 0) {
      continue
    }
    descendants.sort((a, b) => a.id.localeCompare(b.id))
    let childShares = allocateShares(
      cents,
      descendants.map((row) => acquisitionCostCents(row)),
    )
    for (let index = 0; index < descendants.length; index += 1) {
      addHitch(descendants[index]!.id, childShares[index]!)
    }
  }

  return hitchByFlip
}

export type UndoneEventOnFlip =
  | { kind: 'sale'; saleId: string; saleDate: string }
  | { kind: 'write-off'; writeOffId: string; writeOffDate: string }

export async function listUndoneEventsForFlip(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<UndoneEventOnFlip[]> {
  let saleRows = await db.exec(sql`
    select sale.id, sale.sale_date
    from sale_flip
    join sale on sale.id = sale_flip.sale_id
    where sale_flip.flip_id = ${input.flipId}
      and sale_flip.books_id = ${input.booksId}
      and sale_flip.undone = true
  `)
  let writeOffRows = await db.exec(sql`
    select write_off.id, write_off.write_off_date
    from write_off_flip
    join write_off on write_off.id = write_off_flip.write_off_id
    where write_off_flip.flip_id = ${input.flipId}
      and write_off_flip.books_id = ${input.booksId}
      and write_off_flip.undone = true
  `)

  let events: UndoneEventOnFlip[] = []
  for (let row of saleRows.rows ?? []) {
    events.push({
      kind: 'sale',
      saleId: String(row.id),
      saleDate: String(row.sale_date),
    })
  }
  for (let row of writeOffRows.rows ?? []) {
    events.push({
      kind: 'write-off',
      writeOffId: String(row.id),
      writeOffDate: String(row.write_off_date),
    })
  }
  events.sort((a, b) => {
    let dateA = a.kind === 'sale' ? a.saleDate : a.writeOffDate
    let dateB = b.kind === 'sale' ? b.saleDate : b.writeOffDate
    let idA = a.kind === 'sale' ? a.saleId : a.writeOffId
    let idB = b.kind === 'sale' ? b.saleId : b.writeOffId
    return dateB.localeCompare(dateA) || idB.localeCompare(idA)
  })
  return events
}

function nonRetiredDescendants(
  ancestorId: string,
  allFlips: Flip[],
  flipsById: Map<string, Flip>,
): Flip[] {
  return allFlips.filter((flip) => {
    if (flip.retired) {
      return false
    }
    let current: Flip | undefined = flip
    while (current?.parent_flip_id) {
      if (current.parent_flip_id === ancestorId) {
        return true
      }
      current = flipsById.get(current.parent_flip_id)
    }
    return false
  })
}

export async function loadStandingKit(
  db: AppDatabase,
  input: { saleId: string; booksId: string },
): Promise<KitFlip[]> {
  let result = await db.exec(sql`
    select flip.*
    from flip
    join sale_flip on sale_flip.flip_id = flip.id
    where sale_flip.sale_id = ${input.saleId}
      and sale_flip.books_id = ${input.booksId}
      and sale_flip.undone = false
    order by flip.name asc, flip.id asc
  `)
  return ((result.rows ?? []) as Flip[]).map((flip) => ({
    flip,
    acquisitionCostCents: acquisitionCostCents(flip),
  }))
}

export type StandingSaleOnFlip = {
  kind: 'sale'
  sale: Sale
  channel: Channel
  profitCents: number
}

export type StandingWriteOffOnFlip = {
  kind: 'write-off'
  writeOff: WriteOff
  profitCents: number
}

export type StandingRealizingOnFlip = StandingSaleOnFlip | StandingWriteOffOnFlip

export async function loadStandingSaleForFlip(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<StandingSaleOnFlip | null> {
  let result = await db.exec(sql`
    select sale.id
    from sale
    join sale_flip on sale_flip.sale_id = sale.id
    where sale_flip.flip_id = ${input.flipId}
      and sale_flip.books_id = ${input.booksId}
      and sale_flip.undone = false
    limit 1
  `)
  let saleId = result.rows?.[0]?.id ? String(result.rows[0].id) : null
  if (!saleId) {
    return null
  }
  let sale = await findSaleInBooks(db, { saleId, booksId: input.booksId })
  if (!sale) {
    return null
  }
  let channel = await findChannelInBooks(db, { channelId: sale.channel_id, booksId: input.booksId })
  if (!channel) {
    return null
  }
  let kit = await loadStandingKit(db, { saleId: sale.id, booksId: input.booksId })
  let [listingSpend, hitch] = await Promise.all([
    listingSpendByFlipId(db, input.booksId),
    hitchByFlipId(db, input.booksId),
  ])
  let profits = profitSharesForKit(sale, kit, listingSpend, hitch)
  return { kind: 'sale', sale, channel, profitCents: profits.get(input.flipId) ?? 0 }
}

export type TypedMoneyShare = {
  salePrice: number
  buyerPaidShipping: number
  marketplaceFee: number
  outboundShipping: number
  supplies: number
}

export function typedMoneySharesForKit(
  money: Pick<
    Sale,
    'sale_price' | 'buyer_paid_shipping' | 'marketplace_fee' | 'outbound_shipping' | 'supplies'
  >,
  kit: KitFlip[],
): Map<string, TypedMoneyShare> {
  let ordered = [...kit].sort((a, b) => a.flip.id.localeCompare(b.flip.id))
  let weights = ordered.map((row) => row.acquisitionCostCents)
  let salePriceShares = allocateShares(money.sale_price, weights)
  let buyerPaidShares = allocateShares(money.buyer_paid_shipping, weights)
  let feeShares = allocateShares(money.marketplace_fee, weights)
  let shipShares = allocateShares(money.outbound_shipping, weights)
  let supplyShares = allocateShares(money.supplies, weights)
  let shares = new Map<string, TypedMoneyShare>()
  for (let index = 0; index < ordered.length; index += 1) {
    shares.set(ordered[index]!.flip.id, {
      salePrice: salePriceShares[index]!,
      buyerPaidShipping: buyerPaidShares[index]!,
      marketplaceFee: feeShares[index]!,
      outboundShipping: shipShares[index]!,
      supplies: supplyShares[index]!,
    })
  }
  return shares
}

export function profitSharesForKit(
  sale: Pick<
    Sale,
    'sale_price' | 'buyer_paid_shipping' | 'marketplace_fee' | 'outbound_shipping' | 'supplies'
  >,
  kit: KitFlip[],
  listingSpendByFlip: Map<string, number> = new Map(),
  hitchByFlip: Map<string, number> = new Map(),
): Map<string, number> {
  let ordered = [...kit].sort((a, b) => a.flip.id.localeCompare(b.flip.id))
  let weights = ordered.map((row) => row.acquisitionCostCents)
  let proceedsShares = allocateShares(sale.sale_price + sale.buyer_paid_shipping, weights)
  let feeShares = allocateShares(sale.marketplace_fee, weights)
  let shipShares = allocateShares(sale.outbound_shipping, weights)
  let supplyShares = allocateShares(sale.supplies, weights)
  let profits = new Map<string, number>()
  for (let index = 0; index < ordered.length; index += 1) {
    let flipId = ordered[index]!.flip.id
    profits.set(
      flipId,
      proceedsShares[index]! -
        weights[index]! -
        (listingSpendByFlip.get(flipId) ?? 0) -
        (hitchByFlip.get(flipId) ?? 0) -
        feeShares[index]! -
        shipShares[index]! -
        supplyShares[index]!,
    )
  }
  return profits
}

export type CreateSaleInput = {
  booksId: string
  flipIds: string[]
  channelName: string
  saleDate: string
  salePrice: number
  buyerPaidShipping: number
  marketplaceFee: number
  outboundShipping: number
  supplies: number
  notes?: string
}

export async function createSale(
  db: AppDatabase,
  input: CreateSaleInput,
): Promise<{ ok: true; sale: Sale } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    let kit = await loadKitFlips(tx, { booksId: input.booksId, flipIds: input.flipIds })
    if (!kit.ok) {
      return kit
    }
    let channel = await findOrCreateChannelByName(tx, {
      booksId: input.booksId,
      name: input.channelName,
    })
    let sale = (await tx.create(
      sales,
      {
        id: crypto.randomUUID(),
        books_id: input.booksId,
        channel_id: channel.id,
        sale_date: input.saleDate,
        sale_price: input.salePrice,
        buyer_paid_shipping: input.buyerPaidShipping,
        marketplace_fee: input.marketplaceFee,
        outbound_shipping: input.outboundShipping,
        supplies: input.supplies,
        ...(input.notes ? { notes: input.notes } : {}),
      },
      { returnRow: true },
    )) as Sale
    for (let row of kit.kit) {
      await tx.create(saleFlips, {
        books_id: input.booksId,
        sale_id: sale.id,
        flip_id: row.flip.id,
        undone: false,
      })
    }
    await endSoldOutListings(tx, input.booksId)
    return { ok: true as const, sale }
  })
}

export async function replaceSale(
  db: AppDatabase,
  input: Omit<CreateSaleInput, 'flipIds'> & { saleId: string },
): Promise<{ ok: true; sale: Sale } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    let sale = await findSaleInBooks(tx, { saleId: input.saleId, booksId: input.booksId })
    if (!sale) {
      return { ok: false, error: 'Not Found', status: 404 }
    }
    let kit = await loadStandingKit(tx, { saleId: sale.id, booksId: input.booksId })
    if (kit.length === 0) {
      return { ok: false, error: 'This Sale no longer stands.', status: 400 }
    }
    let channel = await findOrCreateChannelByName(tx, {
      booksId: input.booksId,
      name: input.channelName,
    })
    let updated = (await tx.update(sales, sale.id, {
      channel_id: channel.id,
      sale_date: input.saleDate,
      sale_price: input.salePrice,
      buyer_paid_shipping: input.buyerPaidShipping,
      marketplace_fee: input.marketplaceFee,
      outbound_shipping: input.outboundShipping,
      supplies: input.supplies,
      notes: input.notes,
    })) as Sale
    return { ok: true as const, sale: updated }
  })
}

export async function findWriteOffInBooks(
  db: AppDatabase,
  input: { writeOffId: string; booksId: string },
): Promise<WriteOff | null> {
  return db.findOne(writeOffs, { where: { id: input.writeOffId, books_id: input.booksId } })
}

export async function loadStandingWriteOffKit(
  db: AppDatabase,
  input: { writeOffId: string; booksId: string },
): Promise<KitFlip[]> {
  let result = await db.exec(sql`
    select flip.*
    from flip
    join write_off_flip on write_off_flip.flip_id = flip.id
    where write_off_flip.write_off_id = ${input.writeOffId}
      and write_off_flip.books_id = ${input.booksId}
      and write_off_flip.undone = false
    order by flip.name asc, flip.id asc
  `)
  return ((result.rows ?? []) as Flip[]).map((flip) => ({
    flip,
    acquisitionCostCents: acquisitionCostCents(flip),
  }))
}

export async function loadStandingWriteOffForFlip(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<StandingWriteOffOnFlip | null> {
  let result = await db.exec(sql`
    select write_off.id
    from write_off
    join write_off_flip on write_off_flip.write_off_id = write_off.id
    where write_off_flip.flip_id = ${input.flipId}
      and write_off_flip.books_id = ${input.booksId}
      and write_off_flip.undone = false
    limit 1
  `)
  let writeOffId = result.rows?.[0]?.id ? String(result.rows[0].id) : null
  if (!writeOffId) {
    return null
  }
  let writeOff = await findWriteOffInBooks(db, { writeOffId, booksId: input.booksId })
  if (!writeOff) {
    return null
  }
  let kit = await loadStandingWriteOffKit(db, { writeOffId: writeOff.id, booksId: input.booksId })
  let [listingSpend, hitch] = await Promise.all([
    listingSpendByFlipId(db, input.booksId),
    hitchByFlipId(db, input.booksId),
  ])
  let profits = profitSharesForKit(writeOffAsSaleMoney(writeOff), kit, listingSpend, hitch)
  return { kind: 'write-off', writeOff, profitCents: profits.get(input.flipId) ?? 0 }
}

function writeOffAsSaleMoney(
  writeOff: Pick<WriteOff, 'outbound_shipping' | 'supplies'>,
): Pick<
  Sale,
  'sale_price' | 'buyer_paid_shipping' | 'marketplace_fee' | 'outbound_shipping' | 'supplies'
> {
  return {
    sale_price: 0,
    buyer_paid_shipping: 0,
    marketplace_fee: 0,
    outbound_shipping: writeOff.outbound_shipping,
    supplies: writeOff.supplies,
  }
}

export type CreateWriteOffInput = {
  booksId: string
  flipIds: string[]
  writeOffDate: string
  outboundShipping: number
  supplies: number
  notes?: string
}

export async function createWriteOff(
  db: AppDatabase,
  input: CreateWriteOffInput,
): Promise<{ ok: true; writeOff: WriteOff } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    let kit = await loadKitFlips(tx, {
      booksId: input.booksId,
      flipIds: input.flipIds,
      emptyError: 'Pick Inventory Flips to write off.',
      notInventoryError: 'Write-off from Inventory Flips only.',
      requireNoLiveListing: true,
      liveListingError: 'A live Listing blocks Write-off. End the Listing first.',
    })
    if (!kit.ok) {
      return kit
    }
    let writeOff = (await tx.create(
      writeOffs,
      {
        id: crypto.randomUUID(),
        books_id: input.booksId,
        write_off_date: input.writeOffDate,
        outbound_shipping: input.outboundShipping,
        supplies: input.supplies,
        ...(input.notes ? { notes: input.notes } : {}),
      },
      { returnRow: true },
    )) as WriteOff
    for (let row of kit.kit) {
      await tx.create(writeOffFlips, {
        books_id: input.booksId,
        write_off_id: writeOff.id,
        flip_id: row.flip.id,
        undone: false,
      })
    }
    await endSoldOutListings(tx, input.booksId)
    return { ok: true as const, writeOff }
  })
}

export async function replaceWriteOff(
  db: AppDatabase,
  input: Omit<CreateWriteOffInput, 'flipIds'> & { writeOffId: string },
): Promise<{ ok: true; writeOff: WriteOff } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    let writeOff = await findWriteOffInBooks(tx, {
      writeOffId: input.writeOffId,
      booksId: input.booksId,
    })
    if (!writeOff) {
      return { ok: false, error: 'Not Found', status: 404 }
    }
    let kit = await loadStandingWriteOffKit(tx, {
      writeOffId: writeOff.id,
      booksId: input.booksId,
    })
    if (kit.length === 0) {
      return { ok: false, error: 'This Write-off no longer stands.', status: 400 }
    }
    let updated = (await tx.update(writeOffs, writeOff.id, {
      write_off_date: input.writeOffDate,
      outbound_shipping: input.outboundShipping,
      supplies: input.supplies,
      notes: input.notes,
    })) as WriteOff
    return { ok: true as const, writeOff: updated }
  })
}

export type UndoPreview = {
  flip: Flip
  kind: 'sale' | 'write-off'
  hitchMarketplaceFee: number
  hitchOutboundShipping: number
  hitchSupplies: number
}

export async function loadUndoPreview(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<UndoPreview | null> {
  let flip = await findFlipInBooks(db, input)
  if (!flip) {
    return null
  }
  let standingSale = await loadStandingSaleForUndo(db, input)
  if (standingSale) {
    let share = typedMoneySharesForKit(standingSale.sale, standingSale.kit).get(flip.id)
    if (!share) {
      return null
    }
    return {
      flip,
      kind: 'sale',
      hitchMarketplaceFee: share.marketplaceFee,
      hitchOutboundShipping: share.outboundShipping,
      hitchSupplies: share.supplies,
    }
  }
  let standingWriteOff = await loadStandingWriteOffForUndo(db, input)
  if (standingWriteOff) {
    let share = typedMoneySharesForKit(
      writeOffAsSaleMoney(standingWriteOff.writeOff),
      standingWriteOff.kit,
    ).get(flip.id)
    if (!share) {
      return null
    }
    return {
      flip,
      kind: 'write-off',
      hitchMarketplaceFee: 0,
      hitchOutboundShipping: share.outboundShipping,
      hitchSupplies: share.supplies,
    }
  }
  return null
}

export async function undoStandingForFlip(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    let flip = await findFlipInBooks(tx, input)
    if (!flip) {
      return { ok: false, error: 'Not Found', status: 404 }
    }

    let standingSale = await loadStandingSaleForUndo(tx, input)
    if (standingSale) {
      let share = typedMoneySharesForKit(standingSale.sale, standingSale.kit).get(flip.id)
      if (!share) {
        return { ok: false, error: 'Not Found', status: 404 }
      }
      let sale = standingSale.sale
      await tx.update(sales, sale.id, {
        sale_price: sale.sale_price - share.salePrice,
        buyer_paid_shipping: sale.buyer_paid_shipping - share.buyerPaidShipping,
        marketplace_fee: sale.marketplace_fee - share.marketplaceFee,
        outbound_shipping: sale.outbound_shipping - share.outboundShipping,
        supplies: sale.supplies - share.supplies,
      })
      await tx.exec(sql`
        update sale_flip
        set
          undone = true,
          hitch_marketplace_fee = ${share.marketplaceFee},
          hitch_outbound_shipping = ${share.outboundShipping},
          hitch_supplies = ${share.supplies}
        where sale_id = ${sale.id}
          and flip_id = ${flip.id}
          and books_id = ${input.booksId}
          and undone = false
      `)
      return { ok: true as const }
    }

    let standingWriteOff = await loadStandingWriteOffForUndo(tx, input)
    if (standingWriteOff) {
      let share = typedMoneySharesForKit(
        writeOffAsSaleMoney(standingWriteOff.writeOff),
        standingWriteOff.kit,
      ).get(flip.id)
      if (!share) {
        return { ok: false, error: 'Not Found', status: 404 }
      }
      let writeOff = standingWriteOff.writeOff
      await tx.update(writeOffs, writeOff.id, {
        outbound_shipping: writeOff.outbound_shipping - share.outboundShipping,
        supplies: writeOff.supplies - share.supplies,
      })
      await tx.exec(sql`
        update write_off_flip
        set
          undone = true,
          hitch_marketplace_fee = 0,
          hitch_outbound_shipping = ${share.outboundShipping},
          hitch_supplies = ${share.supplies}
        where write_off_id = ${writeOff.id}
          and flip_id = ${flip.id}
          and books_id = ${input.booksId}
          and undone = false
      `)
      return { ok: true as const }
    }

    return { ok: false, error: 'Not Found', status: 404 }
  })
}

async function loadStandingSaleForUndo(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<{ sale: Sale; kit: KitFlip[] } | null> {
  let result = await db.exec(sql`
    select sale.id
    from sale
    join sale_flip on sale_flip.sale_id = sale.id
    where sale_flip.flip_id = ${input.flipId}
      and sale_flip.books_id = ${input.booksId}
      and sale_flip.undone = false
    limit 1
  `)
  let saleId = result.rows?.[0]?.id ? String(result.rows[0].id) : null
  if (!saleId) {
    return null
  }
  let sale = await findSaleInBooks(db, { saleId, booksId: input.booksId })
  if (!sale) {
    return null
  }
  return { sale, kit: await loadStandingKit(db, { saleId: sale.id, booksId: input.booksId }) }
}

async function loadStandingWriteOffForUndo(
  db: AppDatabase,
  input: { flipId: string; booksId: string },
): Promise<{ writeOff: WriteOff; kit: KitFlip[] } | null> {
  let result = await db.exec(sql`
    select write_off.id
    from write_off
    join write_off_flip on write_off_flip.write_off_id = write_off.id
    where write_off_flip.flip_id = ${input.flipId}
      and write_off_flip.books_id = ${input.booksId}
      and write_off_flip.undone = false
    limit 1
  `)
  let writeOffId = result.rows?.[0]?.id ? String(result.rows[0].id) : null
  if (!writeOffId) {
    return null
  }
  let writeOff = await findWriteOffInBooks(db, { writeOffId, booksId: input.booksId })
  if (!writeOff) {
    return null
  }
  return {
    writeOff,
    kit: await loadStandingWriteOffKit(db, { writeOffId: writeOff.id, booksId: input.booksId }),
  }
}

export async function loadWriteOffHub(
  db: AppDatabase,
  input: { writeOffId: string; booksId: string },
) {
  let writeOff = await findWriteOffInBooks(db, input)
  if (!writeOff) {
    return null
  }
  let kit = await loadStandingWriteOffKit(db, input)
  return { writeOff, kit }
}

export type TagSlice = {
  name: string
  untagged: boolean
  profitCents: number
  soldCount: number
  writtenOffCount: number
  inventoryCents: number
  unsoldCount: number
}

export type HomePnl = {
  weekProfitCents: number
  monthProfitCents: number
  yearProfitCents: number
  inventoryCents: number
  slices: TagSlice[]
}

type FlipProfit = {
  flipId: string
  date: string
  profitCents: number
  kind: 'sale' | 'write-off'
}

async function loadStandingFlipProfits(
  db: AppDatabase,
  booksId: string,
): Promise<{ flips: Flip[]; profits: Map<string, FlipProfit> }> {
  let flipRows = await db.exec(sql`
    select *
    from flip
    where books_id = ${booksId}
      and retired = false
  `)
  let flipsInBooks = (flipRows.rows ?? []) as Flip[]
  let flipsById = new Map(flipsInBooks.map((flip) => [flip.id, flip]))

  let membership = await db.exec(sql`
    select
      sale_flip.flip_id,
      sale.id as sale_id,
      sale.sale_date,
      sale.sale_price,
      sale.buyer_paid_shipping,
      sale.marketplace_fee,
      sale.outbound_shipping,
      sale.supplies
    from sale_flip
    join sale on sale.id = sale_flip.sale_id
    where sale_flip.books_id = ${booksId}
      and sale_flip.undone = false
  `)

  type SaleGroup = {
    saleId: string
    saleDate: string
    sale: Pick<
      Sale,
      'sale_price' | 'buyer_paid_shipping' | 'marketplace_fee' | 'outbound_shipping' | 'supplies'
    >
    flipIds: string[]
  }
  let groups = new Map<string, SaleGroup>()
  for (let row of membership.rows ?? []) {
    let saleId = String(row.sale_id)
    let group = groups.get(saleId)
    if (!group) {
      group = {
        saleId,
        saleDate: String(row.sale_date),
        sale: {
          sale_price: Number(row.sale_price),
          buyer_paid_shipping: Number(row.buyer_paid_shipping),
          marketplace_fee: Number(row.marketplace_fee),
          outbound_shipping: Number(row.outbound_shipping),
          supplies: Number(row.supplies),
        },
        flipIds: [],
      }
      groups.set(saleId, group)
    }
    group.flipIds.push(String(row.flip_id))
  }

  let writeOffMembership = await db.exec(sql`
    select
      write_off_flip.flip_id,
      write_off.id as write_off_id,
      write_off.write_off_date,
      write_off.outbound_shipping,
      write_off.supplies
    from write_off_flip
    join write_off on write_off.id = write_off_flip.write_off_id
    where write_off_flip.books_id = ${booksId}
      and write_off_flip.undone = false
  `)

  type WriteOffGroup = {
    writeOffId: string
    writeOffDate: string
    writeOff: Pick<WriteOff, 'outbound_shipping' | 'supplies'>
    flipIds: string[]
  }
  let writeOffGroups = new Map<string, WriteOffGroup>()
  for (let row of writeOffMembership.rows ?? []) {
    let writeOffId = String(row.write_off_id)
    let group = writeOffGroups.get(writeOffId)
    if (!group) {
      group = {
        writeOffId,
        writeOffDate: String(row.write_off_date),
        writeOff: {
          outbound_shipping: Number(row.outbound_shipping),
          supplies: Number(row.supplies),
        },
        flipIds: [],
      }
      writeOffGroups.set(writeOffId, group)
    }
    group.flipIds.push(String(row.flip_id))
  }

  let [listingSpend, hitch] = await Promise.all([
    listingSpendByFlipId(db, booksId),
    hitchByFlipId(db, booksId),
  ])
  let profits = new Map<string, FlipProfit>()
  for (let group of groups.values()) {
    let kit: KitFlip[] = []
    for (let flipId of group.flipIds) {
      let flip = flipsById.get(flipId)
      if (flip) {
        kit.push({ flip, acquisitionCostCents: acquisitionCostCents(flip) })
      }
    }
    let shares = profitSharesForKit(group.sale, kit, listingSpend, hitch)
    for (let [flipId, profitCents] of shares) {
      profits.set(flipId, { flipId, date: group.saleDate, profitCents, kind: 'sale' })
    }
  }
  for (let group of writeOffGroups.values()) {
    let kit: KitFlip[] = []
    for (let flipId of group.flipIds) {
      let flip = flipsById.get(flipId)
      if (flip) {
        kit.push({ flip, acquisitionCostCents: acquisitionCostCents(flip) })
      }
    }
    let shares = profitSharesForKit(writeOffAsSaleMoney(group.writeOff), kit, listingSpend, hitch)
    for (let [flipId, profitCents] of shares) {
      profits.set(flipId, { flipId, date: group.writeOffDate, profitCents, kind: 'write-off' })
    }
  }

  return { flips: flipsInBooks, profits }
}

function sumProfitInWindow(
  profits: Iterable<FlipProfit>,
  today: string,
  kind: ProfitWindowKind,
  weekStart: number,
): number {
  let total = 0
  for (let row of profits) {
    if (dateInWindow(row.date, today, kind, weekStart)) {
      total += row.profitCents
    }
  }
  return total
}

function sliceForFlips(
  name: string,
  untagged: boolean,
  flipsForSlice: Flip[],
  profits: Map<string, FlipProfit>,
  today: string,
  kind: ProfitWindowKind,
  weekStart: number,
): TagSlice {
  let profitCents = 0
  let soldCount = 0
  let writtenOffCount = 0
  let inventoryCents = 0
  let unsoldCount = 0
  for (let flip of flipsForSlice) {
    let realized = profits.get(flip.id)
    if (realized) {
      if (dateInWindow(realized.date, today, kind, weekStart)) {
        profitCents += realized.profitCents
        if (realized.kind === 'write-off') {
          writtenOffCount += 1
        } else {
          soldCount += 1
        }
      }
    } else {
      inventoryCents += acquisitionCostCents(flip)
      unsoldCount += 1
    }
  }
  return { name, untagged, profitCents, soldCount, writtenOffCount, inventoryCents, unsoldCount }
}

export async function loadHomePnl(
  db: AppDatabase,
  booksId: string,
  input: { today: string; weekStart: number; window: ProfitWindowKind },
): Promise<HomePnl> {
  let { flips: bookFlips, profits } = await loadStandingFlipProfits(db, booksId)
  let inventoryCents = bookFlips.reduce((sum, flip) => {
    return profits.has(flip.id) ? sum : sum + acquisitionCostCents(flip)
  }, 0)
  let profitValues = [...profits.values()]

  let [bookTags, membership] = await Promise.all([
    listTagsInBooks(db, booksId),
    db.exec(sql`
      select flip_id, tag_id
      from flip_tag
      where books_id = ${booksId}
    `),
  ])
  let tagIdsByFlip = new Map<string, Set<string>>()
  for (let row of membership.rows ?? []) {
    let flipId = String(row.flip_id)
    let set = tagIdsByFlip.get(flipId) ?? new Set<string>()
    set.add(String(row.tag_id))
    tagIdsByFlip.set(flipId, set)
  }

  let slices: TagSlice[] = bookTags.map((tag) =>
    sliceForFlips(
      tag.name,
      false,
      bookFlips.filter((flip) => tagIdsByFlip.get(flip.id)?.has(tag.id)),
      profits,
      input.today,
      input.window,
      input.weekStart,
    ),
  )
  let untaggedFlips = bookFlips.filter((flip) => (tagIdsByFlip.get(flip.id)?.size ?? 0) === 0)
  if (untaggedFlips.length > 0) {
    slices.push(
      sliceForFlips(
        'Untagged',
        true,
        untaggedFlips,
        profits,
        input.today,
        input.window,
        input.weekStart,
      ),
    )
  }

  return {
    weekProfitCents: sumProfitInWindow(profitValues, input.today, 'week', input.weekStart),
    monthProfitCents: sumProfitInWindow(profitValues, input.today, 'month', input.weekStart),
    yearProfitCents: sumProfitInWindow(profitValues, input.today, 'year', input.weekStart),
    inventoryCents,
    slices,
  }
}

export async function loadSaleHub(
  db: AppDatabase,
  input: { saleId: string; booksId: string },
) {
  let sale = await findSaleInBooks(db, input)
  if (!sale) {
    return null
  }
  let channel = await findChannelInBooks(db, { channelId: sale.channel_id, booksId: input.booksId })
  if (!channel) {
    return null
  }
  let [kit, bookChannels] = await Promise.all([
    loadStandingKit(db, input),
    listChannelsInBooks(db, input.booksId),
  ])
  return { sale, channel, kit, bookChannels }
}


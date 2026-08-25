import { sql } from 'remix/data-table'

import type { AppDatabase } from './db.ts'
import {
  acquisitions,
  books,
  channels,
  flipTags,
  flips,
  operators,
  saleFlips,
  sales,
  tags,
} from './schema.ts'
import type { Acquisition, Channel, Flip, Operator, Sale, Tag } from './schema.ts'
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
  if (existing.retired || (await flipHasStandingSale(db, existing.id))) {
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
  let [flipTagsForFlip, bookTags, parent, standing] = await Promise.all([
    listTagsForFlip(db, input),
    listTagsInBooks(db, input.booksId),
    flip.parent_flip_id
      ? findFlipInBooks(db, { flipId: flip.parent_flip_id, booksId: input.booksId })
      : Promise.resolve(null),
    loadStandingSaleForFlip(db, input),
  ])
  let inboundFrozen = flip.retired || standing != null
  let mayRemove = await unusedFlipMayBeRemoved(db, flip)
  return {
    flip,
    acquisition,
    tags: flipTagsForFlip,
    bookTags,
    parent,
    standing,
    inboundFrozen,
    mayRemove,
    isInventory: !flip.retired && standing == null,
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
    limit 1
  `)
  return (result.rows?.length ?? 0) === 0
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
  input: { booksId: string; flipIds: string[] },
): Promise<{ ok: true; kit: KitFlip[] } | { ok: false; error: string; status: number }> {
  let uniqueIds = [...new Set(input.flipIds.filter(Boolean))]
  if (uniqueIds.length === 0) {
    return { ok: false, error: 'Pick Inventory Flips to sell.', status: 400 }
  }

  let kit: KitFlip[] = []
  for (let flipId of uniqueIds) {
    let flip = await findFlipInBooks(db, { flipId, booksId: input.booksId })
    if (!flip) {
      return { ok: false, error: 'Not Found', status: 404 }
    }
    if (flip.retired || (await flipHasStandingSale(db, flip.id))) {
      return { ok: false, error: 'Sold from Inventory Flips only.', status: 400 }
    }
    kit.push({ flip, acquisitionCostCents: acquisitionCostCents(flip) })
  }
  kit.sort((a, b) => a.flip.name.localeCompare(b.flip.name) || a.flip.id.localeCompare(b.flip.id))
  return { ok: true, kit }
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
  sale: Sale
  channel: Channel
  profitCents: number
}

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
  let profits = profitSharesForKit(sale, kit)
  return { sale, channel, profitCents: profits.get(input.flipId) ?? 0 }
}

export function profitSharesForKit(
  sale: Pick<
    Sale,
    'sale_price' | 'buyer_paid_shipping' | 'marketplace_fee' | 'outbound_shipping' | 'supplies'
  >,
  kit: KitFlip[],
): Map<string, number> {
  let ordered = [...kit].sort((a, b) => a.flip.id.localeCompare(b.flip.id))
  let weights = ordered.map((row) => row.acquisitionCostCents)
  let proceedsShares = allocateShares(sale.sale_price + sale.buyer_paid_shipping, weights)
  let feeShares = allocateShares(sale.marketplace_fee, weights)
  let shipShares = allocateShares(sale.outbound_shipping, weights)
  let supplyShares = allocateShares(sale.supplies, weights)
  let profits = new Map<string, number>()
  for (let index = 0; index < ordered.length; index += 1) {
    profits.set(
      ordered[index]!.flip.id,
      proceedsShares[index]! -
        weights[index]! -
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

export type TagSlice = {
  name: string
  untagged: boolean
  profitCents: number
  soldCount: number
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
  saleDate: string
  profitCents: number
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

  let profits = new Map<string, FlipProfit>()
  for (let group of groups.values()) {
    let kit: KitFlip[] = []
    for (let flipId of group.flipIds) {
      let flip = flipsById.get(flipId)
      if (flip) {
        kit.push({ flip, acquisitionCostCents: acquisitionCostCents(flip) })
      }
    }
    let shares = profitSharesForKit(group.sale, kit)
    for (let [flipId, profitCents] of shares) {
      profits.set(flipId, { flipId, saleDate: group.saleDate, profitCents })
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
    if (dateInWindow(row.saleDate, today, kind, weekStart)) {
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
  let inventoryCents = 0
  let unsoldCount = 0
  for (let flip of flipsForSlice) {
    let realized = profits.get(flip.id)
    if (realized) {
      if (dateInWindow(realized.saleDate, today, kind, weekStart)) {
        profitCents += realized.profitCents
        soldCount += 1
      }
    } else {
      inventoryCents += acquisitionCostCents(flip)
      unsoldCount += 1
    }
  }
  return { name, untagged, profitCents, soldCount, inventoryCents, unsoldCount }
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


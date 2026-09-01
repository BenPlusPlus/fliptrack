import { allocateShares, centsToInput, formatCents, parseCents } from './cents.ts'

export const RESPLIT_CHILD_CAP = 50
export const RESPLIT_CHILD_CAP_ERROR = 'Re-split cannot create more than 50 Flips.'

export type ResplitFormRow = { name: string; itemCost: string }

export type ResplitCanvasRow = ResplitFormRow & { id: string; splitN: string }

export function stampedChildNames(template: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${template} ${String(index + 1).padStart(2, '0')}`)
}

export function initialResplitRows(values?: ResplitFormRow[]): ResplitCanvasRow[] {
  let source =
    values && values.length > 0
      ? values
      : [
          { name: '', itemCost: '' },
          { name: '', itemCost: '' },
        ]
  return source.map((row, index) => ({
    id: `r${index + 1}`,
    name: row.name,
    itemCost: row.itemCost,
    splitN: '',
  }))
}

export function stampResplitRow(row: ResplitCanvasRow, count: number, nextId: () => string): ResplitCanvasRow[] {
  let parsed = parseCents(row.itemCost, { required: true })
  if (!parsed.ok) {
    return [row]
  }
  let names = stampedChildNames(row.name.trim(), count)
  let shares = allocateShares(
    parsed.cents,
    names.map(() => 1),
  )
  return names.map((name, index) => ({
    id: nextId(),
    name,
    itemCost: centsToInput(shares[index]!),
    splitN: '',
  }))
}

export function parseStampN(raw: string): number | null {
  let trimmed = raw.trim()
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null
  }
  let count = Number(trimmed)
  if (!Number.isSafeInteger(count)) {
    return null
  }
  return count
}

export function maxStampCount(rowCount: number): number {
  return RESPLIT_CHILD_CAP - Math.max(rowCount - 1, 0)
}

export function completeRowCents(row: ResplitFormRow): number | null {
  if (row.name.trim() === '') {
    return null
  }
  let cost = parseCents(row.itemCost, { required: true })
  return cost.ok ? cost.cents : null
}

export function allocatedItemCents(rows: ResplitFormRow[]): number {
  let sum = 0
  for (let row of rows) {
    let cost = parseCents(row.itemCost, { required: true })
    if (cost.ok) {
      sum += cost.cents
    }
  }
  return sum
}

export function saveWouldSucceed(parentItemCost: number, rows: ResplitFormRow[]): boolean {
  if (rows.length < 2 || rows.length > RESPLIT_CHILD_CAP) {
    return false
  }
  for (let row of rows) {
    if (completeRowCents(row) == null) {
      return false
    }
  }
  return allocatedItemCents(rows) === parentItemCost
}

export function childAcquisitionPreviews(
  parent: { taxPaid: number; inboundShipping: number },
  rows: ResplitFormRow[],
): string[] {
  let parsed = rows.map((row) => completeRowCents(row))
  let filled = parsed.flatMap((cents, index) => (cents == null ? [] : [{ index, cents }]))
  let taxShares = allocateShares(
    parent.taxPaid,
    filled.map((row) => row.cents),
  )
  let shippingShares = allocateShares(
    parent.inboundShipping,
    filled.map((row) => row.cents),
  )
  let labels = rows.map(() => '—')
  filled.forEach((row, shareIndex) => {
    labels[row.index] = formatCents(row.cents + taxShares[shareIndex]! + shippingShares[shareIndex]!)
  })
  return labels
}

export function canStampRow(
  row: ResplitFormRow & { splitN: string },
  rowCount: number,
): boolean {
  let count = parseStampN(row.splitN)
  if (count == null || count < 2) {
    return false
  }
  if (rowCount - 1 + count > RESPLIT_CHILD_CAP) {
    return false
  }
  return completeRowCents(row) != null
}

export function collectResplitRows(formData: FormData): ResplitFormRow[] {
  let names = formData.getAll('child_name').map(String)
  let costs = formData.getAll('child_item_cost').map(String)
  if (names.length > 0) {
    let values: ResplitFormRow[] = []
    for (let index = 0; index < Math.max(names.length, costs.length); index += 1) {
      values.push({ name: names[index] ?? '', itemCost: costs[index] ?? '' })
    }
    return values
  }

  let values: ResplitFormRow[] = []
  for (let index = 0; index <= RESPLIT_CHILD_CAP; index += 1) {
    let name = formData.get(`child_name.${index}`)
    let itemCost = formData.get(`child_item_cost.${index}`)
    if (name == null && itemCost == null) {
      continue
    }
    values.push({ name: String(name ?? ''), itemCost: String(itemCost ?? '') })
  }
  return values
}

export function parseResplitChildren(formData: FormData):
  | { ok: true; children: { name: string; itemCost: number }[]; values: ResplitFormRow[] }
  | { ok: false; error: string; values: ResplitFormRow[] } {
  let values = collectResplitRows(formData)
  if (values.length > RESPLIT_CHILD_CAP) {
    return { ok: false, error: RESPLIT_CHILD_CAP_ERROR, values }
  }

  let children: { name: string; itemCost: number }[] = []
  for (let row of values) {
    let name = row.name.trim()
    if (name === '') {
      return { ok: false, error: 'Flip name is required.', values }
    }
    let cost = parseCents(row.itemCost, { required: true })
    if (!cost.ok) {
      return { ok: false, error: cost.message, values }
    }
    children.push({ name, itemCost: cost.cents })
  }

  if (children.length < 2) {
    return { ok: false, error: 'Re-split needs at least two children.', values }
  }

  return { ok: true, children, values }
}

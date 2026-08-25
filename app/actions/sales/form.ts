import { isIsoDate } from '../../utils/calendar.ts'
import { parseCents } from '../../utils/cents.ts'

export type SaleFormValues = {
  channel: string
  salePrice: string
  buyerPaidShipping: string
  marketplaceFee: string
  outboundShipping: string
  supplies: string
  saleDate: string
  notes: string
}

export type ParsedSaleForm = {
  channel: string
  saleDate: string
  notes?: string
  salePrice: number
  buyerPaidShipping: number
  marketplaceFee: number
  outboundShipping: number
  supplies: number
}

export function saleValuesFromForm(formData: FormData): SaleFormValues {
  return {
    channel: String(formData.get('channel') ?? ''),
    salePrice: String(formData.get('sale_price') ?? ''),
    buyerPaidShipping: String(formData.get('buyer_paid_shipping') ?? ''),
    marketplaceFee: String(formData.get('marketplace_fee') ?? ''),
    outboundShipping: String(formData.get('outbound_shipping') ?? ''),
    supplies: String(formData.get('supplies') ?? ''),
    saleDate: String(formData.get('sale_date') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  }
}

export function flipIdsFromRequest(formData: FormData, url: URL): string[] {
  let ids = [...formData.getAll('flip'), ...url.searchParams.getAll('flip')]
    .map((value) => String(value).trim())
    .filter(Boolean)
  return [...new Set(ids)]
}

export function parseSaleForm(
  formData: FormData,
): { ok: true; parsed: ParsedSaleForm; values: SaleFormValues } | { ok: false; error: string; values: SaleFormValues } {
  let values = saleValuesFromForm(formData)
  let channel = values.channel.trim()
  if (channel === '') {
    return { ok: false, error: 'Channel is required.', values }
  }
  let saleDate = values.saleDate.trim()
  if (!isIsoDate(saleDate)) {
    return { ok: false, error: 'Sale date is required.', values }
  }

  let salePrice = parseCents(values.salePrice)
  let buyerPaidShipping = parseCents(values.buyerPaidShipping)
  let marketplaceFee = parseCents(values.marketplaceFee)
  let outboundShipping = parseCents(values.outboundShipping)
  let supplies = parseCents(values.supplies)
  if (!salePrice.ok) {
    return { ok: false, error: salePrice.message, values }
  }
  if (!buyerPaidShipping.ok) {
    return { ok: false, error: buyerPaidShipping.message, values }
  }
  if (!marketplaceFee.ok) {
    return { ok: false, error: marketplaceFee.message, values }
  }
  if (!outboundShipping.ok) {
    return { ok: false, error: outboundShipping.message, values }
  }
  if (!supplies.ok) {
    return { ok: false, error: supplies.message, values }
  }

  let notes = values.notes.trim()
  return {
    ok: true,
    values,
    parsed: {
      channel,
      saleDate,
      ...(notes === '' ? {} : { notes }),
      salePrice: salePrice.cents,
      buyerPaidShipping: buyerPaidShipping.cents,
      marketplaceFee: marketplaceFee.cents,
      outboundShipping: outboundShipping.cents,
      supplies: supplies.cents,
    },
  }
}

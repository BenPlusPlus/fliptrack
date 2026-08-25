import { isIsoDate } from '../../utils/calendar.ts'
import { parseCents } from '../../utils/cents.ts'

export type WriteOffFormValues = {
  outboundShipping: string
  supplies: string
  writeOffDate: string
  notes: string
}

export type ParsedWriteOffForm = {
  writeOffDate: string
  notes?: string
  outboundShipping: number
  supplies: number
}

export function writeOffValuesFromForm(formData: FormData): WriteOffFormValues {
  return {
    outboundShipping: String(formData.get('outbound_shipping') ?? ''),
    supplies: String(formData.get('supplies') ?? ''),
    writeOffDate: String(formData.get('write_off_date') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  }
}

export function flipIdsFromRequest(formData: FormData, url: URL): string[] {
  let ids = [...formData.getAll('flip'), ...url.searchParams.getAll('flip')]
    .map((value) => String(value).trim())
    .filter(Boolean)
  return [...new Set(ids)]
}

export function parseWriteOffForm(
  formData: FormData,
):
  | { ok: true; parsed: ParsedWriteOffForm; values: WriteOffFormValues }
  | { ok: false; error: string; values: WriteOffFormValues } {
  let values = writeOffValuesFromForm(formData)
  let writeOffDate = values.writeOffDate.trim()
  if (!isIsoDate(writeOffDate)) {
    return { ok: false, error: 'Write-off date is required.', values }
  }

  let outboundShipping = parseCents(values.outboundShipping)
  let supplies = parseCents(values.supplies)
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
      writeOffDate,
      ...(notes === '' ? {} : { notes }),
      outboundShipping: outboundShipping.cents,
      supplies: supplies.cents,
    },
  }
}

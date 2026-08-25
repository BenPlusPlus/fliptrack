import { parseCents } from '../../utils/cents.ts'

export type ListingFormValues = {
  listingSpend: string
  notes: string
}

export function listingValuesFromForm(formData: FormData): ListingFormValues {
  return {
    listingSpend: String(formData.get('listing_spend') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  }
}

export function flipIdsFromRequest(formData: FormData, url: URL): string[] {
  let ids = [...formData.getAll('flip'), ...url.searchParams.getAll('flip')]
    .map((value) => String(value).trim())
    .filter(Boolean)
  return [...new Set(ids)]
}

export function parseListingForm(
  formData: FormData,
):
  | { ok: true; listingSpend: number; notes?: string; values: ListingFormValues }
  | { ok: false; error: string; values: ListingFormValues } {
  let values = listingValuesFromForm(formData)
  let spend = parseCents(values.listingSpend)
  if (!spend.ok) {
    return { ok: false, error: spend.message, values }
  }
  let notes = values.notes.trim()
  return {
    ok: true,
    values,
    listingSpend: spend.cents,
    ...(notes === '' ? {} : { notes }),
  }
}

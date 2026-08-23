export type CentsParse =
  | { ok: true; cents: number }
  | { ok: false; message: string }

export function parseCents(raw: string, options?: { required?: boolean }): CentsParse {
  let trimmed = raw.trim()
  if (trimmed === '') {
    if (options?.required) {
      return { ok: false, message: 'Item cost is required.' }
    }
    return { ok: true, cents: 0 }
  }
  if (trimmed.startsWith('-')) {
    return { ok: false, message: 'Negatives are refused.' }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, message: 'Enter a dollar amount.' }
  }

  let [dollarsText, centsText = ''] = trimmed.split('.')
  let cents = Number(dollarsText) * 100 + Number((centsText + '00').slice(0, 2))
  if (!Number.isSafeInteger(cents)) {
    return { ok: false, message: 'Enter a dollar amount.' }
  }
  return { ok: true, cents }
}

export function formatCents(cents: number): string {
  if (cents === 0) {
    return '$0'
  }

  let sign = cents < 0 ? '-' : ''
  let absolute = Math.abs(cents)
  let dollars = Math.floor(absolute / 100)
  let remainder = absolute % 100
  return `${sign}$${dollars}.${String(remainder).padStart(2, '0')}`
}

export function allocateShares(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) {
    return []
  }

  let weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum === 0) {
    let base = Math.floor(totalCents / weights.length)
    let shares = weights.map(() => base)
    shares[shares.length - 1] += totalCents - base * weights.length
    return shares
  }

  let shares = weights.map((weight) => Math.floor((totalCents * weight) / weightSum))
  shares[shares.length - 1] += totalCents - shares.reduce((sum, share) => sum + share, 0)
  return shares
}

export type ProfitWindowKind = 'week' | 'month' | 'year'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value)
}

export function parseProfitWindow(raw: string | null): ProfitWindowKind {
  if (raw === 'week' || raw === 'year') {
    return raw
  }
  return 'month'
}

/** 0 = Sunday … 6 = Saturday. Accepts JS `getDay` or Intl `weekInfo.firstDay` (7 = Sunday). */
export function parseWeekStart(raw: string | null): number {
  if (raw == null || raw === '') {
    return 0
  }
  let n = Number(raw)
  if (!Number.isInteger(n)) {
    return 0
  }
  if (n === 7) {
    return 0
  }
  if (n >= 0 && n <= 6) {
    return n
  }
  return 0
}

export function parseTodayParam(raw: string | null): string | null {
  if (raw == null || !ISO_DATE.test(raw)) {
    return null
  }
  return raw
}

export function localToday(): string {
  let now = new Date()
  return formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function windowBounds(
  today: string,
  kind: ProfitWindowKind,
  weekStart: number,
): { from: string; to: string } {
  let parts = today.match(ISO_DATE)
  if (!parts) {
    throw new Error(`Invalid date: ${today}`)
  }
  let year = Number(parts[1])
  let month = Number(parts[2])
  if (kind === 'year') {
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }
  if (kind === 'month') {
    let last = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` }
  }
  let day = Number(parts[3])
  let dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  let offset = (dow - weekStart + 7) % 7
  let from = addUtcDays(today, -offset)
  return { from, to: addUtcDays(from, 6) }
}

export function dateInWindow(
  saleDate: string,
  today: string,
  kind: ProfitWindowKind,
  weekStart: number,
): boolean {
  let { from, to } = windowBounds(today, kind, weekStart)
  return saleDate >= from && saleDate <= to
}

export function addUtcDays(iso: string, days: number): string {
  let parts = iso.match(ISO_DATE)
  if (!parts) {
    throw new Error(`Invalid date: ${iso}`)
  }
  let date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]) + days))
  return formatYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

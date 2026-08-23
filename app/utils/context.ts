export function mustGet<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${name} on request context`)
  }
  return value
}

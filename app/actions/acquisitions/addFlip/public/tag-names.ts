export function uniqueTagNames(values: Iterable<unknown>): string[] {
  let seen = new Set<string>()
  let names: string[] = []
  for (let value of values) {
    let name = String(value).trim()
    if (name === '') continue
    let key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

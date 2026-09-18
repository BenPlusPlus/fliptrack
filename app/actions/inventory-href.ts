import { routes } from '../routes.ts'

export type InventorySegment = 'inventory' | 'sold' | 'written-off'

export type InventoryFilter = { name: string; tagIds: string[]; untagged: boolean }

export function inventoryFilterFrom(source: URLSearchParams | FormData): InventoryFilter {
  let untagged = String(source.get('untagged') ?? '') === '1'
  return {
    name: String(source.get('q') ?? ''),
    tagIds: untagged ? [] : source.getAll('tag').map(String).filter(Boolean),
    untagged,
  }
}

export function inventoryFilterFromRequest(formData: FormData, url: URL): InventoryFilter {
  let fromForm = inventoryFilterFrom(formData)
  if (fromForm.name !== '' || fromForm.tagIds.length > 0 || fromForm.untagged) {
    return fromForm
  }
  return inventoryFilterFrom(url.searchParams)
}

export function inventoryHref(
  segment: InventorySegment,
  filter: InventoryFilter,
  today: string,
): string {
  let params = new URLSearchParams()
  if (segment === 'sold') {
    params.set('segment', 'sold')
  }
  if (segment === 'written-off') {
    params.set('segment', 'written-off')
  }
  if (filter.name !== '') {
    params.set('q', filter.name)
  }
  if (filter.untagged) {
    params.set('untagged', '1')
  } else {
    for (let tagId of filter.tagIds) {
      params.append('tag', tagId)
    }
  }
  if (today !== '') {
    params.set('today', today)
  }
  let query = params.toString()
  return query === '' ? routes.inventory.href() : `${routes.inventory.href()}?${query}`
}

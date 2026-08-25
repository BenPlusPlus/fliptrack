import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { ListingIndexRow } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  heading,
  inventoryItem,
  inventoryList,
  lead,
  mutedNote,
} from '../../ui/styles.ts'
import { formatCents } from '../../utils/cents.ts'

export function ListingsPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    listings: ListingIndexRow[]
  }
}) {
  return () => {
    let { identity, csrf, listings } = handle.props

    return (
      <AppShell title="Listings" identity={identity} csrf={csrf} current="listings">
        <h1 mix={heading}>Listings</h1>
        {listings.length === 0 ? (
          <p mix={lead}>
            No Listings yet.{' '}
            <a href={routes.inventory.href()}>Inventory</a>
          </p>
        ) : (
          <ol mix={inventoryList}>
            {listings.map((row) => (
              <li key={row.listing.id} mix={inventoryItem}>
                <a href={routes.listings.show.href({ listingId: row.listing.id })}>
                  {row.title}
                </a>
                <p mix={mutedNote}>
                  Listing spend {formatCents(row.listing.listing_spend)}
                  {' · '}
                  {row.live ? 'live' : 'ended'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </AppShell>
    )
  }
}

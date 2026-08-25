import { css } from 'remix/ui'

import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { ListingIndexRow } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import { EmptyState, LedgerCell, Money, PageHeader, Stamp } from '../../ui/components.tsx'
import {
  ghostAction,
  ledgerHead,
  ledgerLink,
  ledgerTable,
  ledgerTableRow,
  numericCell,
  revealStagger,
  rowMain,
  rowMeta,
  srOnly,
} from '../../ui/styles.ts'

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
        <PageHeader title="Listings" />
        {listings.length === 0 ? (
          <EmptyState
            title="No Listings yet"
            note="Pick a kit of Flips from Inventory to start one."
          >
            <a href={routes.inventory.href()} mix={ghostAction}>
              Inventory
            </a>
          </EmptyState>
        ) : (
          <ol mix={[ledgerTable, revealStagger]}>
            <li mix={[ledgerHead, listingColumns]} aria-hidden="true">
              <span>Listing</span>
              <span>Status</span>
              <span mix={numericCell}>Spend</span>
            </li>
            {listings.map((row) => (
              <li key={row.listing.id} mix={[ledgerTableRow, listingColumns]}>
                <span mix={rowMain}>
                  <a href={routes.listings.show.href({ listingId: row.listing.id })} mix={ledgerLink}>
                    {row.title}
                  </a>
                  <span mix={srOnly} aria-hidden="true">
                    {row.live ? ' · live' : ' · ended'}
                  </span>
                </span>
                <span>
                  {row.live ? <Stamp tone="gold">Live</Stamp> : <Stamp tone="neutral">Ended</Stamp>}
                </span>
                <span mix={rowMeta}>
                  <LedgerCell label="Spend" numeric>
                    <Money cents={row.listing.listing_spend} tone="flat" />
                  </LedgerCell>
                </span>
              </li>
            ))}
          </ol>
        )}
      </AppShell>
    )
  }
}

/* Shared column layout for the ledger head and each row, above 48rem. */
const listingColumns = css({
  '@media (min-width: 48rem)': {
    gridTemplateColumns: 'minmax(0, 1fr) 6rem 8rem',
  },
})
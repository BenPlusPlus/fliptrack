import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { Flip, Listing } from '../../data/schema.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  heading,
  inventoryItem,
  inventoryList,
  labelStyle,
  lead,
  leaveRow,
  primaryAction,
} from '../../ui/styles.ts'
import { centsToInput } from '../../utils/cents.ts'
import type { ListingFormValues } from './form.ts'

export function ListingPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    listing: Listing
    title: string
    flips: Flip[]
    remainingInventory: Flip[]
    spendFrozen: boolean
    ended: boolean
    error?: string
    values?: ListingFormValues
  }
}) {
  return () => {
    let {
      identity,
      csrf,
      listing,
      title,
      flips,
      remainingInventory,
      spendFrozen,
      ended,
      error,
      values,
    } = handle.props
    let recordHref =
      remainingInventory.length > 0
        ? `${routes.sales.new.index.href()}?${remainingInventory
            .map((flip) => `flip=${flip.id}`)
            .join('&')}`
        : null

    return (
      <AppShell title={title} identity={identity} current="listings">
        <h1 mix={heading}>{title}</h1>
        <p mix={lead}>{ended ? 'ended' : 'live'}</p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <ul mix={inventoryList}>
          {flips.map((flip) => (
            <li key={flip.id} mix={inventoryItem}>
              <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
            </li>
          ))}
        </ul>
        <form
          method="post"
          action={routes.listings.update.href({ listingId: listing.id })}
          mix={fieldStack}
        >
          <input type="hidden" name="_csrf" value={csrf} />
          <label mix={labelStyle}>
            Listing spend
            <input
              type="text"
              inputMode="decimal"
              name="listing_spend"
              defaultValue={values?.listingSpend ?? centsToInput(listing.listing_spend)}
              readOnly={spendFrozen}
            />
          </label>
          <label mix={labelStyle}>
            Notes
            <textarea name="notes" rows={3} defaultValue={values?.notes ?? listing.notes ?? ''}></textarea>
          </label>
          <button type="submit" mix={primaryAction}>
            Save Listing
          </button>
        </form>
        {recordHref ? (
          <p mix={leaveRow}>
            <a href={recordHref} mix={ghostAction}>
              Record Sale
            </a>
          </p>
        ) : null}
        {ended ? null : (
          <form method="post" action={routes.listings.end.href({ listingId: listing.id })}>
            <input type="hidden" name="_csrf" value={csrf} />
            <p mix={leaveRow}>
              <button type="submit" mix={ghostAction}>
                End
              </button>
            </p>
          </form>
        )}
        <p mix={leaveRow}>
          <a href={routes.listings.index.href()} mix={ghostAction}>
            Listings
          </a>
        </p>
      </AppShell>
    )
  }
}

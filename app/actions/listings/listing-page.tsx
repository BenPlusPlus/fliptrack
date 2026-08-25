import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { Flip, Listing } from '../../data/schema.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  ActionStack,
  MoneyField,
  PageHeader,
  Receipt,
  SectionLabel,
  Stamp,
} from '../../ui/components.tsx'
import {
  dangerAction,
  errorBanner,
  fieldStack,
  ghostAction,
  labelStyle,
  ledgerList,
  ledgerRow,
  leaveRow,
  primaryAction,
  splitLayout,
  stackGap,
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
    let readOnly = identity.inspecting != null
    let recordHref =
      remainingInventory.length > 0
        ? `${routes.sales.new.index.href()}?${remainingInventory
            .map((flip) => `flip=${flip.id}`)
            .join('&')}`
        : null

    let statusStamp = ended ? (
      <Stamp tone="neutral">ended</Stamp>
    ) : (
      <Stamp tone="gold">live</Stamp>
    )

    return (
      <AppShell title={title} identity={identity} csrf={csrf} current="listings">
        <PageHeader title={title} aside={statusStamp} />
        <div mix={splitLayout}>
          <div mix={stackGap}>
            <SectionLabel>The Kit</SectionLabel>
            <ul mix={ledgerList}>
              {flips.map((flip) => (
                <li key={flip.id} mix={ledgerRow}>
                  <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <Receipt>
            {error ? <p mix={errorBanner}>{error}</p> : null}
            <form
              method="post"
              action={routes.listings.update.href({ listingId: listing.id })}
              mix={fieldStack}
            >
              <input type="hidden" name="_csrf" value={csrf} />
              <MoneyField
                label="Listing spend"
                name="listing_spend"
                defaultValue={values?.listingSpend ?? centsToInput(listing.listing_spend)}
                readOnly={spendFrozen || readOnly}
              />
              <label mix={labelStyle}>
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={values?.notes ?? listing.notes ?? ''}
                  readOnly={readOnly}
                ></textarea>
              </label>
              {readOnly ? null : (
                <button type="submit" mix={primaryAction}>
                  Save Listing
                </button>
              )}
            </form>
            <ActionStack>
              {recordHref && !readOnly ? (
                <a href={recordHref} mix={ghostAction}>
                  Record Sale
                </a>
              ) : null}
              {ended || readOnly ? null : (
                <form method="post" action={routes.listings.end.href({ listingId: listing.id })}>
                  <input type="hidden" name="_csrf" value={csrf} />
                  <button type="submit" mix={dangerAction}>End</button>
                </form>
              )}
            </ActionStack>
            <p mix={leaveRow}>
              <a href={routes.listings.index.href()} mix={ghostAction}>
                Listings
              </a>
            </p>
          </Receipt>
        </div>
      </AppShell>
    )
  }
}

import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { createListing, loadKitFlips, type KitFlip } from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
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
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
import { formatCents } from '../../../utils/cents.ts'
import {
  flipIdsFromRequest,
  parseListingForm,
  type ListingFormValues,
} from '../form.ts'

export default createController(routes.listings.new, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flipIds = context.url.searchParams.getAll('flip')
      let kit = await loadKitFlips(db, {
        booksId: identity.booksId,
        flipIds,
        emptyError: 'Pick Inventory Flips for a Listing.',
      })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }
      return context.render(
        <NewListingPage
          identity={identity}
          csrf={getCsrfToken(context)}
          kit={kit.kit}
        />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let formData = context.get(FormData)
      let flipIds = flipIdsFromRequest(formData, context.url)
      let parsed = parseListingForm(formData)
      let kit = await loadKitFlips(db, {
        booksId: identity.booksId,
        flipIds,
        emptyError: 'Pick Inventory Flips for a Listing.',
      })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }

      if (!parsed.ok) {
        return context.render(
          <NewListingPage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={kit.kit}
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await createListing(db, {
        booksId: identity.booksId,
        flipIds,
        listingSpend: parsed.listingSpend,
        ...(parsed.notes ? { notes: parsed.notes } : {}),
      })
      if (!result.ok) {
        return context.render(
          <NewListingPage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={kit.kit}
            error={result.error}
            values={parsed.values}
          />,
          { status: result.status },
        )
      }

      return redirect(routes.listings.show.href({ listingId: result.listing.id }), 303)
    },
  },
})

function NewListingPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    kit: KitFlip[]
    error?: string
    values?: ListingFormValues
  }
}) {
  return () => {
    let { identity, csrf, kit, error, values } = handle.props

    return (
      <AppShell title="Listing" identity={identity} current="listings">
        <h1 mix={heading}>Listing</h1>
        <p mix={lead}>The Flip set is fixed at save.</p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <ul mix={inventoryList}>
          {kit.map((row) => (
            <li key={row.flip.id} mix={inventoryItem}>
              {row.flip.name} — Acquisition cost {formatCents(row.acquisitionCostCents)}
            </li>
          ))}
        </ul>
        <form method="post" action={routes.listings.new.action.href()} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          {kit.map((row) => (
            <input key={row.flip.id} type="hidden" name="flip" value={row.flip.id} />
          ))}
          <label mix={labelStyle}>
            Listing spend
            <input
              type="text"
              inputMode="decimal"
              name="listing_spend"
              defaultValue={values?.listingSpend ?? '0'}
            />
          </label>
          <label mix={labelStyle}>
            Notes
            <textarea name="notes" rows={3} defaultValue={values?.notes ?? ''}></textarea>
          </label>
          <button type="submit" mix={primaryAction}>
            Save Listing
          </button>
        </form>
        <p mix={leaveRow}>
          <a href={routes.inventory.href()} mix={ghostAction}>
            Inventory
          </a>
        </p>
      </AppShell>
    )
  }
}

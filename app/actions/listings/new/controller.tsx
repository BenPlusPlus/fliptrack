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
  LedgerCell,
  Money,
  MoneyField,
  PageHeader,
  Receipt,
  SectionLabel,
} from '../../../ui/components.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  labelStyle,
  ledgerList,
  ledgerRow,
  leaveRow,
  primaryAction,
  rowMain,
  splitLayout,
  stackGap,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
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
      <AppShell title="Listing" identity={identity} csrf={csrf} current="listings">
        <PageHeader title="Listing" lead="The Flip set is fixed at save." />
        <div mix={splitLayout}>
          <div mix={stackGap}>
            <SectionLabel>The Kit</SectionLabel>
            <ul mix={ledgerList}>
              {kit.map((row) => (
                <li key={row.flip.id} mix={ledgerRow}>
                  <span mix={rowMain}>
                    <span>{row.flip.name}</span>
                    <LedgerCell label="Acquisition cost" numeric>
                      <Money cents={row.acquisitionCostCents} tone="flat" />
                    </LedgerCell>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Receipt>
            {error ? <p mix={errorBanner}>{error}</p> : null}
            <form method="post" action={routes.listings.new.action.href()} mix={fieldStack}>
              <input type="hidden" name="_csrf" value={csrf} />
              {kit.map((row) => (
                <input key={row.flip.id} type="hidden" name="flip" value={row.flip.id} />
              ))}
              <MoneyField
                label="Listing spend"
                name="listing_spend"
                defaultValue={values?.listingSpend ?? '0'}
              />
              <label mix={labelStyle}>
                Notes
                <textarea name="notes" rows={3} defaultValue={values?.notes ?? ''}></textarea>
              </label>
              {identity.inspecting ? null : (
                <button type="submit" mix={primaryAction}>
                  Save Listing
                </button>
              )}
            </form>
            <p mix={leaveRow}>
              <a href={routes.inventory.href()} mix={ghostAction}>
                Inventory
              </a>
            </p>
          </Receipt>
        </div>
      </AppShell>
    )
  }
}

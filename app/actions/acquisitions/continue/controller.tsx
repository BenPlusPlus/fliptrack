import { Session } from 'remix/session'
import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { findAcquisitionInBooks, replaceAcquisitionFacts } from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import type { Acquisition } from '../../../data/schema.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  heading,
  labelStyle,
  lead,
  leaveRow,
  primaryAction,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
import { parseCents } from '../../../utils/cents.ts'
import { SITTING_KEY, type Sitting } from '../sitting.ts'

export default createController(routes.acquisitions.continue, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let acquisition = await findAcquisitionInBooks(
        mustGet(context.get(databaseContext), 'database'),
        {
          acquisitionId: context.params.acquisitionId,
          booksId: identity.booksId,
        },
      )
      if (!acquisition) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <ContinueAcquisitionPage
          identity={identity}
          csrf={getCsrfToken(context)}
          acquisition={acquisition}
        />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let acquisition = await findAcquisitionInBooks(db, {
        acquisitionId: context.params.acquisitionId,
        booksId: identity.booksId,
      })
      if (!acquisition) {
        return new Response('Not Found', { status: 404 })
      }

      let formData = context.get(FormData)
      let csrf = getCsrfToken(context)
      let acquisitionDate = String(formData.get('acquisition_date') ?? '').trim()
      let notesRaw = String(formData.get('notes') ?? '').trim()
      let tax = parseCents(String(formData.get('tax_paid') ?? ''))
      let inbound = parseCents(String(formData.get('inbound_shipping') ?? ''))

      if (!/^\d{4}-\d{2}-\d{2}$/.test(acquisitionDate) || !tax.ok || !inbound.ok) {
        return context.render(
          <ContinueAcquisitionPage
            identity={identity}
            csrf={csrf}
            acquisition={acquisition}
            error={
              !/^\d{4}-\d{2}-\d{2}$/.test(acquisitionDate)
                ? 'Acquisition date is required.'
                : !tax.ok
                  ? tax.message
                  : inbound.ok
                    ? undefined
                    : inbound.message
            }
            values={{
              acquisitionDate,
              notes: notesRaw,
              taxPaid: String(formData.get('tax_paid') ?? '0'),
              inboundShipping: String(formData.get('inbound_shipping') ?? '0'),
            }}
          />,
          { status: 400 },
        )
      }

      await replaceAcquisitionFacts(db, {
        acquisitionId: acquisition.id,
        booksId: identity.booksId,
        acquisitionDate,
        ...(notesRaw === '' ? {} : { notes: notesRaw }),
      })

      let sitting: Sitting = {
        acquisitionId: acquisition.id,
        taxPaid: tax.cents,
        inboundShipping: inbound.cents,
        flipIds: [],
      }
      mustGet(context.get(Session), 'session').set(SITTING_KEY, sitting)

      return redirect(
        routes.acquisitions.addFlip.index.href({ acquisitionId: acquisition.id }),
        303,
      )
    },
  },
})

function ContinueAcquisitionPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    acquisition: Acquisition
    error?: string
    values?: {
      acquisitionDate: string
      notes: string
      taxPaid: string
      inboundShipping: string
    }
  }
}) {
  return () => {
    let { identity, csrf, acquisition, error, values } = handle.props
    let action = routes.acquisitions.continue.action.href({ acquisitionId: acquisition.id })

    return (
      <AppShell title="Add Flips" identity={identity} hideNav>
        <h1 mix={heading}>Add Flips to this Acquisition</h1>
        <p mix={lead}>
          Header Tax paid and Inbound shipping are this sitting only. They default to $0 and
          snapshot onto the new Flips only.
        </p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={action} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          <label mix={labelStyle}>
            Acquisition date
            <input
              type="date"
              name="acquisition_date"
              required
              defaultValue={values?.acquisitionDate ?? String(acquisition.acquisition_date)}
            />
          </label>
          <label mix={labelStyle}>
            Notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={values?.notes ?? acquisition.notes ?? ''}
            ></textarea>
          </label>
          <label mix={labelStyle}>
            Tax paid
            <input
              type="text"
              inputMode="decimal"
              name="tax_paid"
              defaultValue={values?.taxPaid ?? '0'}
            />
          </label>
          <label mix={labelStyle}>
            Inbound shipping
            <input
              type="text"
              inputMode="decimal"
              name="inbound_shipping"
              defaultValue={values?.inboundShipping ?? '0'}
            />
          </label>
          <button type="submit" mix={primaryAction}>
            Add Flips
          </button>
        </form>
        <p mix={leaveRow}>
          <a href={routes.home.href()} mix={ghostAction}>
            Leave
          </a>
        </p>
      </AppShell>
    )
  }
}

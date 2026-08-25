import { Session } from 'remix/session'
import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { createAcquisition } from '../../../data/queries.ts'
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
  labelStyle,
  lead,
  leaveRow,
  primaryAction,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
import { parseCents } from '../../../utils/cents.ts'
import { SITTING_KEY, type Sitting } from '../sitting.ts'

export default createController(routes.acquisitions.new, {
  middleware: [requireOperator()],
  actions: {
    index(context) {
      let identity = operatorFrom(context)
      return context.render(<NewAcquisitionPage identity={identity} csrf={getCsrfToken(context)} />)
    },

    async action(context) {
      let identity = operatorFrom(context)
      let formData = context.get(FormData)
      let csrf = getCsrfToken(context)
      let acquisitionDate = String(formData.get('acquisition_date') ?? '').trim()
      let notesRaw = String(formData.get('notes') ?? '').trim()
      let tax = parseCents(String(formData.get('tax_paid') ?? ''))
      let inbound = parseCents(String(formData.get('inbound_shipping') ?? ''))

      if (!/^\d{4}-\d{2}-\d{2}$/.test(acquisitionDate)) {
        return context.render(
          <NewAcquisitionPage
            identity={identity}
            csrf={csrf}
            error="Acquisition date is required."
            values={formValues(formData)}
          />,
          { status: 400 },
        )
      }
      if (!tax.ok || !inbound.ok) {
        return context.render(
          <NewAcquisitionPage
            identity={identity}
            csrf={csrf}
            error={!tax.ok ? tax.message : inbound.ok ? undefined : inbound.message}
            values={formValues(formData)}
          />,
          { status: 400 },
        )
      }

      let acquisition = await createAcquisition(mustGet(context.get(databaseContext), 'database'), {
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

      return redirect(routes.acquisitions.addFlip.index.href({ acquisitionId: acquisition.id }), 303)
    },
  },
})

function formValues(formData: FormData) {
  return {
    acquisitionDate: String(formData.get('acquisition_date') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    taxPaid: String(formData.get('tax_paid') ?? '0'),
    inboundShipping: String(formData.get('inbound_shipping') ?? '0'),
  }
}

function NewAcquisitionPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
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
    let { identity, csrf, error, values } = handle.props

    return (
      <AppShell title="New Acquisition" identity={identity} csrf={csrf} hideNav>
        <h1 mix={heading}>New Acquisition</h1>
        <p mix={lead}>
          Date defaults to today. Change it for opening stock. Then add Flips one at a time.
        </p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={routes.acquisitions.new.action.href()} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          <label mix={labelStyle}>
            Acquisition date
            <input
              id="acquisition_date"
              type="date"
              name="acquisition_date"
              required
              defaultValue={values?.acquisitionDate ?? ''}
            />
          </label>
          <label mix={labelStyle}>
            Notes
            <textarea name="notes" rows={3}></textarea>
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
          {identity.inspecting ? null : (
            <button type="submit" mix={primaryAction}>
              Add Flips
            </button>
          )}
        </form>
        <p mix={leaveRow}>
          <a href={routes.home.href()} mix={ghostAction}>
            Leave
          </a>
        </p>
        <script>
          {`(function(){var i=document.getElementById('acquisition_date');if(!i||i.value)return;var d=new Date();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');i.value=d.getFullYear()+'-'+m+'-'+day;})();`}
        </script>
      </AppShell>
    )
  }
}

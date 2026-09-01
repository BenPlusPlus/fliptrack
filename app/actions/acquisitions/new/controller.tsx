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
import { ActionStack, MoneyField, PageHeader, Receipt } from '../../../ui/components.tsx'
import { DateInput } from '../../../ui/public/date-input.tsx'
import { errorBanner, fieldGrid, fieldWide, ghostAction, labelStyle, primaryAction } from '../../../ui/styles.ts'
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
        <PageHeader
          title="New Acquisition"
          lead="Date defaults to today. Change it for opening stock. Then add Flips one at a time."
        />
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <Receipt>
          <form method="post" action={routes.acquisitions.new.action.href()} mix={fieldGrid}>
            <input type="hidden" name="_csrf" value={csrf} />
            <label mix={[labelStyle, fieldWide]}>
              Acquisition date
              <DateInput
                id="acquisition_date"
                name="acquisition_date"
                required
                defaultToToday
                defaultValue={values?.acquisitionDate ?? ''}
              />
            </label>
            <label mix={[labelStyle, fieldWide]}>
              Notes
              <textarea name="notes" rows={3}></textarea>
            </label>
            <MoneyField label="Tax paid" name="tax_paid" defaultValue={values?.taxPaid ?? '0'} />
            <MoneyField
              label="Inbound shipping"
              name="inbound_shipping"
              defaultValue={values?.inboundShipping ?? '0'}
            />
            <ActionStack>
              {identity.inspecting ? null : (
                <button type="submit" mix={primaryAction}>
                  Add Flips
                </button>
              )}
              <a href={routes.home.href()} mix={ghostAction}>
                Leave
              </a>
            </ActionStack>
          </form>
        </Receipt>
      </AppShell>
    )
  }
}

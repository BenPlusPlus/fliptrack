import { Session } from 'remix/session'
import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  addFlipAndSnapshotSitting,
  findAcquisitionInBooks,
} from '../../../data/queries.ts'
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

export default createController(routes.acquisitions.addFlip, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let acquisition = await findAcquisitionInBooks(mustGet(context.get(databaseContext), 'database'), {
        acquisitionId: context.params.acquisitionId,
        booksId: identity.booksId,
      })
      if (!acquisition) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <AddFlipPage
          identity={identity}
          csrf={getCsrfToken(context)}
          acquisitionId={acquisition.id}
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
      let name = String(formData.get('name') ?? '').trim()
      let notesRaw = String(formData.get('notes') ?? '').trim()
      let itemCost = parseCents(String(formData.get('item_cost') ?? ''), { required: true })

      if (name === '' || !itemCost.ok) {
        return context.render(
          <AddFlipPage
            identity={identity}
            csrf={csrf}
            acquisitionId={acquisition.id}
            error={
              name === ''
                ? 'Flip name is required.'
                : itemCost.ok
                  ? undefined
                  : itemCost.message
            }
            values={{
              name: String(formData.get('name') ?? ''),
              notes: notesRaw,
              itemCost: String(formData.get('item_cost') ?? ''),
            }}
          />,
          { status: 400 },
        )
      }

      let sitting = sittingFor(
        mustGet(context.get(Session), 'session').get(SITTING_KEY),
        acquisition.id,
      )

      await addFlipAndSnapshotSitting(db, {
        booksId: identity.booksId,
        acquisitionId: acquisition.id,
        name,
        ...(notesRaw === '' ? {} : { notes: notesRaw }),
        itemCost: itemCost.cents,
        ...(sitting
          ? { sitting: { taxPaid: sitting.taxPaid, inboundShipping: sitting.inboundShipping } }
          : {}),
      })

      return redirect(
        routes.acquisitions.addFlip.index.href({ acquisitionId: acquisition.id }),
        303,
      )
    },
  },
})

function sittingFor(value: unknown, acquisitionId: string): Sitting | null {
  if (
    value &&
    typeof value === 'object' &&
    'acquisitionId' in value &&
    (value as Sitting).acquisitionId === acquisitionId
  ) {
    return value as Sitting
  }
  return null
}

function AddFlipPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    acquisitionId: string
    error?: string
    values?: { name: string; notes: string; itemCost: string }
  }
}) {
  return () => {
    let { identity, csrf, acquisitionId, error, values } = handle.props
    let action = routes.acquisitions.addFlip.action.href({ acquisitionId })

    return (
      <AppShell title="Add Flip" identity={identity} hideNav>
        <h1 mix={heading}>Add a Flip</h1>
        <p mix={lead}>
          Name and Item cost are required. Flip notes are skippable. Stay until you leave.
        </p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={action} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          <label mix={labelStyle}>
            Flip name
            <input
              type="text"
              name="name"
              required
              defaultValue={values?.name ?? ''}
              autoComplete="off"
            />
          </label>
          <label mix={labelStyle}>
            Item cost
            <input
              type="text"
              inputMode="decimal"
              name="item_cost"
              required
              defaultValue={values?.itemCost}
            />
          </label>
          <label mix={labelStyle}>
            Flip notes
            <textarea name="notes" rows={3}></textarea>
          </label>
          <button type="submit" mix={primaryAction}>
            Save Flip
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

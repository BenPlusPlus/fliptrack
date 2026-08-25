import { Session } from 'remix/session'
import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  addFlipAndSnapshotSitting,
  attachNamedTagToFlip,
  findAcquisitionInBooks,
  listTagsInBooks,
} from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import type { Tag } from '../../../data/schema.ts'
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

      let bookTags = await listTagsInBooks(
        mustGet(context.get(databaseContext), 'database'),
        identity.booksId,
      )

      return context.render(
        <AddFlipPage
          identity={identity}
          csrf={getCsrfToken(context)}
          acquisitionId={acquisition.id}
          bookTags={bookTags}
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
      let tagName = String(formData.get('tag') ?? '').trim()
      let itemCost = parseCents(String(formData.get('item_cost') ?? ''), { required: true })
      let bookTags = await listTagsInBooks(db, identity.booksId)

      if (name === '' || !itemCost.ok) {
        return context.render(
          <AddFlipPage
            identity={identity}
            csrf={csrf}
            acquisitionId={acquisition.id}
            bookTags={bookTags}
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
              tag: tagName,
            }}
          />,
          { status: 400 },
        )
      }

      let session = mustGet(context.get(Session), 'session')
      let sitting = sittingFor(session.get(SITTING_KEY), acquisition.id)

      let created = await addFlipAndSnapshotSitting(db, {
        booksId: identity.booksId,
        acquisitionId: acquisition.id,
        name,
        ...(notesRaw === '' ? {} : { notes: notesRaw }),
        itemCost: itemCost.cents,
        ...(sitting ? { sitting } : {}),
      })

      if (sitting) {
        session.set(SITTING_KEY, {
          ...sitting,
          flipIds: [...sitting.flipIds, created.id],
        })
      }

      if (tagName !== '') {
        await attachNamedTagToFlip(db, {
          flipId: created.id,
          booksId: identity.booksId,
          name: tagName,
        })
      }

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
    let sitting = value as Sitting
    return {
      acquisitionId: sitting.acquisitionId,
      taxPaid: sitting.taxPaid,
      inboundShipping: sitting.inboundShipping,
      flipIds: Array.isArray(sitting.flipIds) ? sitting.flipIds : [],
    }
  }
  return null
}

function AddFlipPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    acquisitionId: string
    bookTags: Tag[]
    error?: string
    values?: { name: string; notes: string; itemCost: string; tag?: string }
  }
}) {
  return () => {
    let { identity, csrf, acquisitionId, bookTags, error, values } = handle.props
    let action = routes.acquisitions.addFlip.action.href({ acquisitionId })

    return (
      <AppShell title="Add Flip" identity={identity} csrf={csrf} hideNav>
        <h1 mix={heading}>Add a Flip</h1>
        <p mix={lead}>
          Name and Item cost are required. Flip notes and Tags are skippable. Stay until you leave.
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
            <textarea name="notes" rows={3} defaultValue={values?.notes ?? ''}></textarea>
          </label>
          <label mix={labelStyle}>
            Tag
            <input
              type="text"
              name="tag"
              list="tag-names"
              autoComplete="off"
              defaultValue={values?.tag ?? ''}
            />
          </label>
          <datalist id="tag-names">
            {bookTags.map((tag) => (
              <option key={tag.id} value={tag.name}></option>
            ))}
          </datalist>
          {identity.inspecting ? null : (
            <button type="submit" mix={primaryAction}>
              Save Flip
            </button>
          )}
        </form>
        <p mix={leaveRow}>
          <a
            href={routes.acquisitions.show.href({ acquisitionId })}
            mix={ghostAction}
          >
            Leave
          </a>
        </p>
      </AppShell>
    )
  }
}

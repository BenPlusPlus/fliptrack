import { css } from 'remix/ui'
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
import type { Acquisition, Tag } from '../../../data/schema.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import { ActionStack, MoneyField, PageHeader, Receipt } from '../../../ui/components.tsx'
import {
  FONT_MONEY,
  errorBanner,
  fieldGrid,
  fieldWide,
  ghostAction,
  labelStyle,
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
          acquisition={acquisition}
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
            acquisition={acquisition}
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
    acquisition: Acquisition
    bookTags: Tag[]
    error?: string
    values?: { name: string; notes: string; itemCost: string; tag?: string }
  }
}) {
  return () => {
    let { identity, csrf, acquisition, bookTags, error, values } = handle.props
    let action = routes.acquisitions.addFlip.action.href({ acquisitionId: acquisition.id })
    let date = String(acquisition.acquisition_date)
    let notes =
      typeof acquisition.notes === 'string' && acquisition.notes !== '' ? acquisition.notes : null
    let firstLand = error == null && values == null

    return (
      <AppShell title="Add Flip" identity={identity} csrf={csrf} hideNav>
        <PageHeader title="Add a Flip">
          <div mix={firstLand ? [dateLine, dateLineEnter] : dateLine}>
            <time dateTime={date} mix={dateLineDate}>
              {date}
            </time>
            {notes ? <p mix={dateLineNotes}>{notes}</p> : null}
          </div>
        </PageHeader>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <Receipt>
          <form method="post" action={action} mix={fieldGrid}>
            <input type="hidden" name="_csrf" value={csrf} />
            <label mix={[labelStyle, fieldWide]}>
              Flip name
              <input
                type="text"
                name="name"
                required
                autoFocus={firstLand ? true : undefined}
                defaultValue={values?.name ?? ''}
                autoComplete="off"
              />
            </label>
            <MoneyField
              label="Item cost"
              name="item_cost"
              required
              defaultValue={values?.itemCost}
            />
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
            <label mix={[labelStyle, fieldWide]}>
              Flip notes
              <textarea name="notes" rows={3} defaultValue={values?.notes ?? ''}></textarea>
            </label>
            <datalist id="tag-names">
              {bookTags.map((tag) => (
                <option key={tag.id} value={tag.name}></option>
              ))}
            </datalist>
            <ActionStack>
              {identity.inspecting ? null : (
                <button type="submit" mix={primaryAction}>
                  Save Flip
                </button>
              )}
              <a
                href={routes.acquisitions.show.href({ acquisitionId: acquisition.id })}
                mix={ghostAction}
              >
                Leave
              </a>
            </ActionStack>
          </form>
        </Receipt>
      </AppShell>
    )
  }
}

const dateLine = css({
  display: 'grid',
  gap: '0.2rem 1rem',
  margin: '0.1rem 0 0',
  minWidth: 0,
  '@media (min-width: 48rem)': {
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'start',
  },
})

const dateLineEnter = css({
  animation: 'ft-rise 220ms ease both',
})

const dateLineDate = css({
  fontFamily: FONT_MONEY,
  fontVariantNumeric: 'tabular-nums',
  fontSize: '0.78rem',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
  lineHeight: 1.4,
})

const dateLineNotes = css({
  margin: 0,
  color: 'var(--muted)',
  fontSize: '0.93rem',
  lineHeight: 1.4,
  minWidth: 0,
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: '2',
  lineClamp: '2',
  overflow: 'hidden',
})

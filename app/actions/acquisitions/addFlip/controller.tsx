import { css } from 'remix/ui'
import { Session } from 'remix/session'
import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  addFlipAndSnapshotSitting,
  attachNamedTagToFlip,
  findAcquisitionInBooks,
  listAcquisitionFlips,
  listTagsInBooks,
} from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import type { Acquisition, Tag } from '../../../data/schema.ts'
import type { AppDatabase } from '../../../data/db.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import { ActionStack, Money, MoneyField, PageHeader, Receipt, SectionLabel } from '../../../ui/components.tsx'
import {
  FONT_MONEY,
  errorBanner,
  fieldGrid,
  fieldWide,
  ghostAction,
  labelStyle,
  primaryAction,
  revealStagger,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
import { parseCents } from '../../../utils/cents.ts'
import { SITTING_KEY, sittingFor, type Sitting } from '../sitting.ts'

const SITTING_PHONE_CAP = 3
const SITTING_DESK_CAP = 5

type SittingFlip = { id: string; name: string; itemCost: number }

export default createController(routes.acquisitions.addFlip, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let acquisition = await findAcquisitionInBooks(db, {
        acquisitionId: context.params.acquisitionId,
        booksId: identity.booksId,
      })
      if (!acquisition) {
        return new Response('Not Found', { status: 404 })
      }

      let bookTags = await listTagsInBooks(db, identity.booksId)
      let session = mustGet(context.get(Session), 'session')
      let sittingFlips = await loadSittingFlips(db, {
        booksId: identity.booksId,
        acquisitionId: acquisition.id,
        sitting: sittingFor(session.get(SITTING_KEY), acquisition.id),
      })

      return context.render(
        <AddFlipPage
          identity={identity}
          csrf={getCsrfToken(context)}
          acquisition={acquisition}
          bookTags={bookTags}
          sittingFlips={sittingFlips}
          revealSitting
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
      let session = mustGet(context.get(Session), 'session')
      let sitting = sittingFor(session.get(SITTING_KEY), acquisition.id)

      if (name === '' || !itemCost.ok) {
        let sittingFlips = await loadSittingFlips(db, {
          booksId: identity.booksId,
          acquisitionId: acquisition.id,
          sitting,
        })
        return context.render(
          <AddFlipPage
            identity={identity}
            csrf={csrf}
            acquisition={acquisition}
            bookTags={bookTags}
            sittingFlips={sittingFlips}
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

async function loadSittingFlips(
  db: AppDatabase,
  input: { booksId: string; acquisitionId: string; sitting: Sitting | null },
): Promise<SittingFlip[]> {
  if (!input.sitting || input.sitting.flipIds.length === 0) {
    return []
  }

  let flips = await listAcquisitionFlips(db, {
    acquisitionId: input.acquisitionId,
    booksId: input.booksId,
  })
  let byId = new Map(flips.map((flip) => [flip.id, flip]))
  let rows: SittingFlip[] = []
  for (let id of [...input.sitting.flipIds].reverse()) {
    let flip = byId.get(id)
    if (flip) {
      rows.push({ id: flip.id, name: flip.name, itemCost: flip.item_cost })
    }
  }
  return rows
}

function AddFlipPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    acquisition: Acquisition
    bookTags: Tag[]
    sittingFlips: SittingFlip[]
    revealSitting?: boolean
    error?: string
    values?: { name: string; notes: string; itemCost: string; tag?: string }
  }
}) {
  return () => {
    let { identity, csrf, acquisition, bookTags, sittingFlips, revealSitting, error, values } =
      handle.props
    let action = routes.acquisitions.addFlip.action.href({ acquisitionId: acquisition.id })
    let date = String(acquisition.acquisition_date)
    let notes =
      typeof acquisition.notes === 'string' && acquisition.notes !== '' ? acquisition.notes : null
    let firstLand = error == null && values == null
    let showStrip = sittingFlips.length > 0

    let header = (
      <PageHeader title="Add a Flip">
        <div mix={firstLand ? [dateLine, dateLineEnter] : dateLine}>
          <time dateTime={date} mix={dateLineDate}>
            {date}
          </time>
          {notes ? <p mix={dateLineNotes}>{notes}</p> : null}
        </div>
      </PageHeader>
    )

    let form = (
      <>
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
      </>
    )

    return (
      <AppShell title="Add Flip" identity={identity} csrf={csrf} hideNav wideFocus={showStrip}>
        {showStrip ? (
          <div mix={addFlipLayout}>
            <div mix={addFlipHead}>{header}</div>
            <SittingStrip flips={sittingFlips} reveal={revealSitting === true} />
            <div mix={addFlipForm}>{form}</div>
          </div>
        ) : (
          <>
            {header}
            {form}
          </>
        )}
      </AppShell>
    )
  }
}

function SittingStrip(handle: { props: { flips: SittingFlip[]; reveal: boolean } }) {
  return () => {
    let { flips, reveal } = handle.props
    let visible = flips.slice(0, SITTING_DESK_CAP)
    let phoneMore = flips.length - SITTING_PHONE_CAP
    let deskMore = flips.length - SITTING_DESK_CAP

    return (
      <section mix={addFlipStrip}>
        <SectionLabel>This sitting</SectionLabel>
        <ol mix={reveal ? [sittingList, revealStagger] : sittingList}>
          {visible.map((flip) => (
            <li key={flip.id} mix={sittingRow}>
              <span mix={sittingName}>{flip.name}</span>
              <Money cents={flip.itemCost} tone="flat" />
            </li>
          ))}
        </ol>
        {phoneMore > 0 ? <p mix={sittingMorePhone}>{phoneMore} more</p> : null}
        {deskMore > 0 ? <p mix={sittingMoreDesk}>{deskMore} more</p> : null}
      </section>
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

const addFlipLayout = css({
  display: 'grid',
  gap: '1.1rem',
  minWidth: 0,
  gridTemplateAreas: `
    "head"
    "strip"
    "form"
  `,
  '@media (min-width: 64rem)': {
    gridTemplateColumns: 'minmax(0, 15rem) minmax(0, 1fr)',
    gap: '1.75rem',
    alignItems: 'start',
    gridTemplateAreas: `
      "strip head"
      "strip form"
    `,
  },
})

const addFlipHead = css({ gridArea: 'head', minWidth: 0 })
const addFlipStrip = css({ gridArea: 'strip', minWidth: 0 })
const addFlipForm = css({ gridArea: 'form', minWidth: 0 })

const sittingList = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  [`& > li:nth-child(n+${SITTING_PHONE_CAP + 1})`]: { display: 'none' },
  '@media (min-width: 64rem)': {
    [`& > li:nth-child(n+${SITTING_PHONE_CAP + 1})`]: { display: 'grid' },
    [`& > li:nth-child(n+${SITTING_DESK_CAP + 1})`]: { display: 'none' },
  },
})

const sittingRow = css({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '0.7rem',
  alignItems: 'baseline',
  padding: '0.5rem 0',
  borderBottom: '1px dashed var(--rule)',
  minWidth: 0,
})

const sittingName = css({
  minWidth: 0,
  overflowWrap: 'anywhere',
  fontWeight: 700,
})

const sittingMore = {
  margin: '0.5rem 0 0',
  color: 'var(--muted)',
  fontSize: '0.85rem',
}

const sittingMorePhone = css({
  ...sittingMore,
  '@media (min-width: 64rem)': { display: 'none' },
})

const sittingMoreDesk = css({
  ...sittingMore,
  display: 'none',
  '@media (min-width: 64rem)': { display: 'block' },
})

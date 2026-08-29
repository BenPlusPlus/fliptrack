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
import { mustGet } from '../../../utils/context.ts'
import { parseCents } from '../../../utils/cents.ts'
import { SITTING_KEY, sittingFor, type Sitting } from '../sitting.ts'
import { AddFlipForm, SITTING_DESK_CAP, type SittingFlip } from './public/add-flip-form.tsx'

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
      let sitting = sittingFor(session.get(SITTING_KEY), acquisition.id)
      let sittingFlips = await loadSittingFlips(db, {
        booksId: identity.booksId,
        acquisitionId: acquisition.id,
        sitting,
      })

      return context.render(
        <AddFlipPage
          identity={identity}
          csrf={getCsrfToken(context)}
          acquisition={acquisition}
          bookTags={bookTags}
          sittingFlips={sittingFlips}
          trackSitting={sitting != null}
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
            trackSitting={sitting != null}
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

      if (context.request.headers.get('Sec-Fetch-Dest') === 'empty') {
        return new Response(null, { status: 204 })
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
    trackSitting?: boolean
    revealSitting?: boolean
    error?: string
    values?: { name: string; notes: string; itemCost: string; tag?: string }
  }
}) {
  return () => {
    let { identity, csrf, acquisition, bookTags, sittingFlips, trackSitting, revealSitting, error, values } =
      handle.props
    let notes =
      typeof acquisition.notes === 'string' && acquisition.notes !== '' ? acquisition.notes : null

    return (
      <AppShell
        title="Add Flip"
        identity={identity}
        csrf={csrf}
        hideNav
        wideFocus={sittingFlips.length > 0}
      >
        <AddFlipForm
          csrf={csrf}
          action={routes.acquisitions.addFlip.action.href({ acquisitionId: acquisition.id })}
          leaveHref={routes.acquisitions.show.href({ acquisitionId: acquisition.id })}
          inspecting={identity.inspecting != null}
          tagNames={bookTags.map((tag) => tag.name)}
          acquisitionDate={String(acquisition.acquisition_date)}
          acquisitionNotes={notes}
          sittingFlips={sittingFlips.slice(0, SITTING_DESK_CAP)}
          sittingTotal={sittingFlips.length}
          trackSitting={trackSitting === true}
          revealSitting={revealSitting === true}
          error={error}
          values={values}
        />
      </AppShell>
    )
  }
}

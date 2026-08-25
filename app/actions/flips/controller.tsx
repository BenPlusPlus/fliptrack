import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  attachNamedTagToFlip,
  detachTagFromFlip,
  loadFlipHub,
  removeUnusedFlip,
  replaceFlipFacts,
} from '../../data/queries.ts'
import { databaseContext } from '../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../middleware/auth.ts'
import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { StandingRealizingOnFlip, UndoneEventOnFlip } from '../../data/queries.ts'
import type { Acquisition, Flip, Tag } from '../../data/schema.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  heading,
  labelStyle,
  leaveRow,
  mutedNote,
  primaryAction,
  tagChip,
  tagList,
  tagSection,
} from '../../ui/styles.ts'
import { mustGet } from '../../utils/context.ts'
import { centsToInput, formatCents, parseCents } from '../../utils/cents.ts'

export default createController(routes.flips, {
  middleware: [requireOperator()],
  actions: {
    async show(context) {
      let identity = operatorFrom(context)
      let hub = await loadFlipHub(mustGet(context.get(databaseContext), 'database'), {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <FlipHubPage
          identity={identity}
          csrf={getCsrfToken(context)}
          flip={hub.flip}
          acquisition={hub.acquisition}
          tags={hub.tags}
          bookTags={hub.bookTags}
          parent={hub.parent}
          standing={hub.standing}
          hitchCents={hub.hitchCents}
          undoneEvents={hub.undoneEvents}
          inboundFrozen={hub.inboundFrozen}
          mayRemove={hub.mayRemove}
          isInventory={hub.isInventory}
          mayResplit={hub.mayResplit}
          mayWriteOff={hub.mayWriteOff}
        />,
      )
    },

    async update(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let hub = await loadFlipHub(db, {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }
      let {
        flip,
        acquisition,
        tags,
        bookTags,
        parent,
        standing,
        hitchCents,
        undoneEvents,
        inboundFrozen,
        mayRemove,
        isInventory,
        mayResplit,
        mayWriteOff,
      } = hub

      let formData = context.get(FormData)
      let name = String(formData.get('name') ?? '').trim()
      let notesRaw = String(formData.get('notes') ?? '').trim()
      let itemCost = parseCents(String(formData.get('item_cost') ?? ''), { required: true })
      let taxPaid = parseCents(String(formData.get('tax_paid') ?? ''))
      let inbound = parseCents(String(formData.get('inbound_shipping') ?? ''))

      if (name === '' || !itemCost.ok || !taxPaid.ok || !inbound.ok) {
        return context.render(
          <FlipHubPage
            identity={identity}
            csrf={getCsrfToken(context)}
            flip={flip}
            acquisition={acquisition}
            tags={tags}
            bookTags={bookTags}
            parent={parent}
            standing={standing}
            hitchCents={hitchCents}
            undoneEvents={undoneEvents}
            inboundFrozen={inboundFrozen}
            mayRemove={mayRemove}
            isInventory={isInventory}
            mayResplit={mayResplit}
            mayWriteOff={mayWriteOff}
            error={
              name === ''
                ? 'Flip name is required.'
                : !itemCost.ok
                  ? itemCost.message
                  : !taxPaid.ok
                    ? taxPaid.message
                    : inbound.ok
                      ? undefined
                      : inbound.message
            }
            values={{
              name: String(formData.get('name') ?? ''),
              notes: notesRaw,
              itemCost: String(formData.get('item_cost') ?? ''),
              taxPaid: String(formData.get('tax_paid') ?? ''),
              inboundShipping: String(formData.get('inbound_shipping') ?? ''),
            }}
          />,
          { status: 400 },
        )
      }

      await replaceFlipFacts(db, {
        flipId: flip.id,
        booksId: identity.booksId,
        name,
        ...(notesRaw === '' ? {} : { notes: notesRaw }),
        itemCost: itemCost.cents,
        taxPaid: taxPaid.cents,
        inboundShipping: inbound.cents,
      })

      return redirect(routes.flips.show.href({ flipId: flip.id }), 303)
    },

    async addTag(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let hub = await loadFlipHub(db, {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }

      let name = String(context.get(FormData).get('tag') ?? '').trim()
      if (name !== '') {
        await attachNamedTagToFlip(db, {
          flipId: hub.flip.id,
          booksId: identity.booksId,
          name,
        })
      }

      return redirect(routes.flips.show.href({ flipId: hub.flip.id }), 303)
    },

    async removeTag(context) {
      let identity = operatorFrom(context)
      let ok = await detachTagFromFlip(mustGet(context.get(databaseContext), 'database'), {
        flipId: context.params.flipId,
        tagId: context.params.tagId,
        booksId: identity.booksId,
      })
      if (!ok) {
        return new Response('Not Found', { status: 404 })
      }
      return redirect(routes.flips.show.href({ flipId: context.params.flipId }), 303)
    },

    async remove(context) {
      let identity = operatorFrom(context)
      let result = await removeUnusedFlip(mustGet(context.get(databaseContext), 'database'), {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!result.ok) {
        return new Response(result.error, { status: result.status })
      }
      return redirect(routes.inventory.href(), 303)
    },
  },
})

function FlipHubPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    flip: Flip
    acquisition: Acquisition
    tags: Tag[]
    bookTags: Tag[]
    parent: Flip | null
    standing: StandingRealizingOnFlip | null
    hitchCents: number
    undoneEvents: UndoneEventOnFlip[]
    inboundFrozen: boolean
    mayRemove: boolean
    isInventory: boolean
    mayResplit: boolean
    mayWriteOff: boolean
    error?: string
    values?: {
      name: string
      notes: string
      itemCost: string
      taxPaid: string
      inboundShipping: string
    }
  }
}) {
  return () => {
    let {
      identity,
      csrf,
      flip,
      acquisition,
      tags,
      bookTags,
      parent,
      standing,
      hitchCents,
      undoneEvents,
      inboundFrozen,
      mayRemove,
      isInventory,
      mayResplit,
      mayWriteOff,
      error,
      values,
    } = handle.props
    let readOnly = identity.inspecting != null

    return (
      <AppShell title={flip.name} identity={identity} csrf={csrf} current="inventory">
        <h1 mix={heading}>{values?.name ?? flip.name}</h1>
        {flip.retired ? <p mix={mutedNote}>Retired</p> : null}
        {parent ? (
          <p mix={mutedNote}>
            Re-split from{' '}
            <a href={routes.flips.show.href({ flipId: parent.id })}>{parent.name}</a>
          </p>
        ) : null}
        {standing?.kind === 'sale' ? (
          <p mix={mutedNote}>
            Profit {formatCents(standing.profitCents)}
            {' · '}
            <a href={routes.sales.show.href({ saleId: standing.sale.id })}>Sale</a>
          </p>
        ) : null}
        {standing?.kind === 'write-off' ? (
          <p mix={mutedNote}>
            Profit {formatCents(standing.profitCents)}
            {' · '}
            <a href={routes.writeOffs.show.href({ writeOffId: standing.writeOff.id })}>Write-off</a>
          </p>
        ) : null}
        {isInventory && hitchCents > 0 ? (
          <p mix={mutedNote}>
            {formatCents(hitchCents)} will count on the next Sale or Write-off
          </p>
        ) : null}
        {undoneEvents.map((event) =>
          event.kind === 'sale' ? (
            <p mix={mutedNote} key={`sale-${event.saleId}`}>
              Undone Sale
              {' · '}
              <a href={routes.sales.show.href({ saleId: event.saleId })}>Sale</a>
            </p>
          ) : (
            <p mix={mutedNote} key={`write-off-${event.writeOffId}`}>
              Undone Write-off
              {' · '}
              <a href={routes.writeOffs.show.href({ writeOffId: event.writeOffId })}>Write-off</a>
            </p>
          ),
        )}
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={routes.flips.update.href({ flipId: flip.id })} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          <label mix={labelStyle}>
            Flip name
            <input
              type="text"
              name="name"
              required
              defaultValue={values?.name ?? flip.name}
              autoComplete="off"
              readOnly={readOnly}
            />
          </label>
          <label mix={labelStyle}>
            Notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={values?.notes ?? flip.notes ?? ''}
              readOnly={readOnly}
            ></textarea>
          </label>
          <label mix={labelStyle}>
            Item cost
            <input
              type="text"
              inputMode="decimal"
              name="item_cost"
              required
              defaultValue={values?.itemCost ?? centsToInput(flip.item_cost)}
              readOnly={inboundFrozen || readOnly}
            />
          </label>
          <label mix={labelStyle}>
            Tax paid
            <input
              type="text"
              inputMode="decimal"
              name="tax_paid"
              defaultValue={values?.taxPaid ?? centsToInput(flip.tax_paid)}
              readOnly={inboundFrozen || readOnly}
            />
          </label>
          <label mix={labelStyle}>
            Inbound shipping
            <input
              type="text"
              inputMode="decimal"
              name="inbound_shipping"
              defaultValue={values?.inboundShipping ?? centsToInput(flip.inbound_shipping)}
              readOnly={inboundFrozen || readOnly}
            />
          </label>
          {readOnly ? null : (
            <button type="submit" mix={primaryAction}>
              Save Flip
            </button>
          )}
        </form>
        <section mix={tagSection}>
          <h2 mix={labelStyle}>Tags</h2>
          {tags.length > 0 ? (
            <ul mix={tagList}>
              {tags.map((tag) => (
                <li key={tag.id} mix={tagChip}>
                  {tag.name}
                  {readOnly ? null : (
                    <form
                      method="post"
                      action={routes.flips.removeTag.href({ flipId: flip.id, tagId: tag.id })}
                    >
                      <input type="hidden" name="_csrf" value={csrf} />
                      <button type="submit" aria-label={`Remove ${tag.name}`}>
                        ×
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p mix={mutedNote}>No Tags yet.</p>
          )}
          {readOnly ? null : (
            <form
              method="post"
              action={routes.flips.addTag.href({ flipId: flip.id })}
              mix={fieldStack}
            >
              <input type="hidden" name="_csrf" value={csrf} />
              <label mix={labelStyle}>
                Add Tag
                <input
                  type="text"
                  name="tag"
                  list="tag-names"
                  autoComplete="off"
                  placeholder="Name a Tag"
                />
              </label>
              <datalist id="tag-names">
                {bookTags.map((tag) => (
                  <option key={tag.id} value={tag.name}></option>
                ))}
              </datalist>
              <button type="submit" mix={ghostAction}>
                Add Tag
              </button>
            </form>
          )}
        </section>
        <p mix={mutedNote}>Acquisition {String(acquisition.acquisition_date)}</p>
        {typeof acquisition.notes === 'string' && acquisition.notes !== '' ? (
          <p mix={mutedNote}>{acquisition.notes}</p>
        ) : null}
        {readOnly ? null : (
          <p mix={leaveRow}>
            <a
              href={routes.acquisitions.continue.index.href({ acquisitionId: acquisition.id })}
              mix={ghostAction}
            >
              Add Flips to this Acquisition
            </a>
          </p>
        )}
        {standing && !readOnly ? (
          <p mix={leaveRow}>
            <a href={routes.flips.undo.index.href({ flipId: flip.id })} mix={ghostAction}>
              Undo
            </a>
          </p>
        ) : null}
        {isInventory && !readOnly ? (
          <p mix={leaveRow}>
            <a
              href={`${routes.sales.new.index.href()}?flip=${flip.id}`}
              mix={ghostAction}
            >
              Sold
            </a>
          </p>
        ) : null}
        {mayWriteOff && !readOnly ? (
          <p mix={leaveRow}>
            <a
              href={`${routes.writeOffs.new.index.href()}?flip=${flip.id}`}
              mix={ghostAction}
            >
              Write-off
            </a>
          </p>
        ) : null}
        {mayResplit && !readOnly ? (
          <p mix={leaveRow}>
            <a
              href={routes.flips.resplit.index.href({ flipId: flip.id })}
              mix={ghostAction}
            >
              Re-split
            </a>
          </p>
        ) : null}
        {mayRemove && !readOnly ? (
          <form method="post" action={routes.flips.remove.href({ flipId: flip.id })}>
            <input type="hidden" name="_csrf" value={csrf} />
            <button type="submit" mix={ghostAction}>
              Remove
            </button>
          </form>
        ) : null}
      </AppShell>
    )
  }
}

import { css, type RemixNode } from 'remix/ui'

import type { Tag } from '../data/schema.ts'
import { acquisitionCostCents, type DeskPickRow, type LiveListingOnRow } from '../data/queries.ts'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { calendarDaysHeld } from '../utils/calendar.ts'
import { AppShell } from '../ui/shell.tsx'
import { EmptyState, Money, PageHeader, SectionLabel, Stamp } from '../ui/components.tsx'
import {
  FONT_MONEY,
  bulkBar,
  checkLabel,
  ctaRow,
  fieldsetReset,
  ghostAction,
  labelStyle,
  ledgerList,
  ledgerRow,
  primaryAction,
  receipt,
  revealStagger,
  segmentBar,
  segmentTab,
  tagRail,
} from '../ui/styles.ts'

type Segment = 'inventory' | 'sold' | 'written-off'
type Filter = { name: string; tagIds: string[]; untagged: boolean }

export function InventoryPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    rows: DeskPickRow[]
    bookTags: Tag[]
    filter: Filter
    segment: Segment
    today: string
  }
}) {
  return () => {
    let { identity, csrf, rows, bookTags, filter, segment, today } = handle.props
    let sold = segment === 'sold'
    let writtenOff = segment === 'written-off'
    let title = sold ? 'Sold' : writtenOff ? 'Written-off' : 'Inventory'
    let readOnly = identity.inspecting != null
    let filtered = filter.name !== '' || filter.untagged || filter.tagIds.length > 0
    let listId = sold ? 'sold-list' : writtenOff ? 'written-off-list' : 'inventory-list'
    let selectable = !sold && !writtenOff && !readOnly

    let listItems = rows.map((row) => (
      <li key={row.flip.id} mix={ledgerRow} data-name={row.flip.name}>
        <PickRow row={row} selectable={selectable} today={today} />
      </li>
    ))

    let emptyNote = filtered
      ? 'No Flips match.'
      : sold
        ? 'No sold Flips yet.'
        : writtenOff
          ? 'No written-off Flips yet.'
          : 'Nothing in Inventory yet.'

    return (
      <AppShell title={title} identity={identity} csrf={csrf} current="inventory">
        <PageHeader title={title} />

        <nav mix={segmentBar} aria-label="Segment">
          <a
            href={inventoryHref('inventory', filter, today)}
            mix={segmentTab}
            aria-current={segment === 'inventory' ? 'page' : undefined}
          >
            Inventory
          </a>
          <a
            href={inventoryHref('sold', filter, today)}
            mix={segmentTab}
            aria-current={sold ? 'page' : undefined}
          >
            Sold
          </a>
          <a
            href={inventoryHref('written-off', filter, today)}
            mix={segmentTab}
            aria-current={writtenOff ? 'page' : undefined}
          >
            Written-off
          </a>
        </nav>

        <div mix={browseLayout}>
          <form
            method="get"
            action={routes.inventory.href()}
            mix={[receipt, filterPanel]}
          >
            {sold ? <input type="hidden" name="segment" value="sold" /> : null}
            {writtenOff ? <input type="hidden" name="segment" value="written-off" /> : null}
            <input type="hidden" name="today" value={today} />
            <SectionLabel>Filter</SectionLabel>
            <label mix={labelStyle}>
              Name
              <input
                type="search"
                name="q"
                defaultValue={filter.name}
                autoComplete="off"
                id="inventory-name-filter"
                placeholder="Type to narrow"
              />
            </label>
            {bookTags.length > 0 ? (
              <fieldset mix={fieldsetReset}>
                <legend mix={legendStyle}>Tags</legend>
                <ul mix={tagRail}>
                  {bookTags.map((tag) => (
                    <li key={tag.id}>
                      <label mix={checkLabel}>
                        <input
                          type="checkbox"
                          name="tag"
                          value={tag.id}
                          defaultChecked={selectedTag(filter, tag.id)}
                        />
                        {tag.name}
                      </label>
                    </li>
                  ))}
                  <li>
                    <label mix={checkLabel}>
                      <input
                        type="checkbox"
                        name="untagged"
                        value="1"
                        defaultChecked={filter.untagged}
                      />
                      Untagged
                    </label>
                  </li>
                </ul>
              </fieldset>
            ) : null}
            <button type="submit" mix={ghostAction}>
              Filter
            </button>
          </form>

          <div mix={listColumn}>
            {rows.length === 0 ? (
              <EmptyState title={emptyNote}>
                {!filtered && !sold && !writtenOff && !readOnly ? (
                  <a href={routes.acquisitions.new.index.href()} mix={ghostAction}>
                    New Acquisition
                  </a>
                ) : null}
              </EmptyState>
            ) : selectable ? (
              <form method="get" action={routes.sales.new.index.href()}>
                <ol mix={[ledgerList, revealStagger]} id={listId}>
                  {listItems}
                </ol>
                <div mix={bulkBar}>
                  <button type="submit" mix={primaryAction}>
                    Sold
                  </button>
                  <button
                    type="submit"
                    formaction={routes.writeOffs.new.index.href()}
                    mix={ghostAction}
                  >
                    Write-off
                  </button>
                  <button
                    type="submit"
                    formaction={routes.listings.new.index.href()}
                    mix={ghostAction}
                  >
                    Listing
                  </button>
                </div>
              </form>
            ) : (
              <ol mix={[ledgerList, revealStagger]} id={listId}>
                {listItems}
              </ol>
            )}

            {readOnly ? null : (
              <p mix={ctaRow}>
                <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
                  New Acquisition
                </a>
              </p>
            )}
          </div>
        </div>
        <script>
          {`(function(){var u=new URL(location.href);if(u.searchParams.get('today'))return;var d=new Date();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');u.searchParams.set('today',d.getFullYear()+'-'+m+'-'+day);location.replace(u.pathname+u.search);})();`}
        </script>
        <script>
          {`(function(){var i=document.getElementById('inventory-name-filter');var list=document.getElementById('inventory-list')||document.getElementById('sold-list')||document.getElementById('written-off-list');if(!i||!list)return;i.addEventListener('input',function(){var q=i.value.trim().toLowerCase();for(var n=0;n<list.children.length;n++){var li=list.children[n];var name=(li.getAttribute('data-name')||'').toLowerCase();li.hidden=q!==''&&name.indexOf(q)===-1;}});})();`}
        </script>
      </AppShell>
    )
  }
}

function PickRow(handle: { props: { row: DeskPickRow; selectable: boolean; today: string } }) {
  return () => {
    let { row, selectable, today } = handle.props
    let flipHref = routes.flips.show.href({ flipId: row.flip.id })
    let money =
      row.kind === 'inventory' ? (
        <Money cents={acquisitionCostCents(row.flip)} tone="flat" />
      ) : (
        <Money cents={row.profitCents} />
      )

    return (
      <div mix={rowInner}>
        <div mix={rowLead}>
          {selectable ? (
            <label mix={pickLabel}>
              <input type="checkbox" name="flip" value={row.flip.id} />{' '}
              <a href={flipHref}>{row.flip.name}</a>
            </label>
          ) : (
            <a href={flipHref}>{row.flip.name}</a>
          )}
          <RowMeta row={row} today={today} />
        </div>
        <span mix={rowCost}>{money}</span>
      </div>
    )
  }
}

function RowMeta(handle: { props: { row: DeskPickRow; today: string } }) {
  return () => {
    let { row, today } = handle.props
    let parts: { key: string; node: RemixNode }[] = []

    if (row.kind === 'inventory') {
      parts.push({
        key: 'days',
        node: <span mix={daysHeldMark}>{calendarDaysHeld(row.acquisitionDate, today)}d</span>,
      })
      if (row.liveListings.length > 0) {
        parts.push({ key: 'listings', node: <LiveListings listings={row.liveListings} /> })
      }
    } else if (row.kind === 'sold') {
      if (row.saleDate !== '') {
        parts.push({ key: 'date', node: row.saleDate })
      }
      if (row.channelName !== '') {
        parts.push({ key: 'channel', node: row.channelName })
      }
    } else if (row.writeOffDate !== '') {
      parts.push({ key: 'date', node: row.writeOffDate })
    }

    if (row.tags.length > 0) {
      parts.push({
        key: 'tags',
        node: (
          <>
            {row.tags.map((tag) => (
              <span key={tag.id} mix={rowTagChip}>
                {tag.name}
              </span>
            ))}
          </>
        ),
      })
    }

    if (parts.length === 0) {
      return null
    }

    return (
      <div mix={pickMeta}>
        {parts.map((part, index) => (
          <span key={part.key}>
            {index > 0 ? ' · ' : null}
            {part.node}
          </span>
        ))}
      </div>
    )
  }
}

function LiveListings(handle: { props: { listings: LiveListingOnRow[] } }) {
  return () => (
    <>
      {handle.props.listings.map((listing) => (
        <a
          key={listing.listingId}
          href={routes.listings.show.href({ listingId: listing.listingId })}
          mix={liveListingLink}
        >
          <Stamp tone="gold">Live</Stamp>
          {listing.kitTitle ? ` ${listing.kitTitle}` : null}
        </a>
      ))}
    </>
  )
}

function selectedTag(filter: Filter, tagId: string): boolean {
  return filter.tagIds.includes(tagId) && !filter.untagged
}

function inventoryHref(segment: Segment, filter: Filter, today: string): string {
  let params = new URLSearchParams()
  if (segment === 'sold') {
    params.set('segment', 'sold')
  }
  if (segment === 'written-off') {
    params.set('segment', 'written-off')
  }
  if (filter.name !== '') {
    params.set('q', filter.name)
  }
  if (filter.untagged) {
    params.set('untagged', '1')
  } else {
    for (let tagId of filter.tagIds) {
      params.append('tag', tagId)
    }
  }
  if (today !== '') {
    params.set('today', today)
  }
  let query = params.toString()
  return query === '' ? routes.inventory.href() : `${routes.inventory.href()}?${query}`
}

/* ------------------------------- local styles ----------------------------- */

/* Filters sit above the list on mobile and beside it from 64rem up, where
 * there is room for a permanent filter column. */
const browseLayout = css({
  display: 'grid',
  gap: '1.1rem',
  alignItems: 'start',
  '@media (min-width: 64rem)': {
    gridTemplateColumns: 'minmax(0, 17rem) minmax(0, 1fr)',
    gap: '1.75rem',
  },
})

const filterPanel = css({
  display: 'grid',
  gap: '0.85rem',
  padding: '1rem',
  '@media (min-width: 64rem)': {
    position: 'sticky',
    top: '5rem',
    padding: '1.1rem',
  },
})

const listColumn = css({ minWidth: 0 })

const legendStyle = css({
  padding: 0,
  marginBottom: '0.45rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
})

/* Checkbox + name are the pick hit; meta sits outside so Live / Tags do not
 * toggle Sold. */
const pickLabel = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  cursor: 'pointer',
  minWidth: 0,
  '& input': { accentColor: 'var(--stamp)', width: '1.05rem', height: '1.05rem', flexShrink: 0 },
})

const rowInner = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
  minWidth: 0,
})

const rowLead = css({
  minWidth: 0,
  flex: 1,
})

/* Acquisition cost / Profit anchors the right edge so the ledger reads as
 * columns on wide screens instead of a row of stranded names. */
const rowCost = css({
  flexShrink: 0,
  fontSize: '0.85rem',
  color: 'var(--muted)',
  paddingTop: '0.15rem',
})

const pickMeta = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: '0.2rem',
  rowGap: '0.25rem',
  margin: '0.35rem 0 0',
  fontSize: '0.85rem',
  color: 'var(--muted)',
})

const daysHeldMark = css({
  fontFamily: FONT_MONEY,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.04em',
})

const liveListingLink = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  marginRight: '0.45rem',
  fontWeight: 400,
  color: 'var(--ink-soft)',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline', textDecorationColor: 'var(--gold)' },
  '&:last-child': { marginRight: 0 },
})

const rowTagChip = css({
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: '0.35rem',
  fontSize: '0.78rem',
  fontWeight: 400,
  letterSpacing: 0,
  textTransform: 'none',
  color: 'var(--ink-soft)',
  border: '1px solid var(--rule)',
  borderRadius: '999px',
  padding: '0.1rem 0.5rem',
  background: 'var(--card-sunk)',
  '&:last-child': { marginRight: 0 },
})

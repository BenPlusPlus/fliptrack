import { css } from 'remix/ui'

import type { Flip, Tag } from '../data/schema.ts'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/shell.tsx'
import { EmptyState, Money, PageHeader, SectionLabel } from '../ui/components.tsx'
import {
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
    flips: Flip[]
    bookTags: Tag[]
    filter: Filter
    segment: Segment
  }
}) {
  return () => {
    let { identity, csrf, flips, bookTags, filter, segment } = handle.props
    let sold = segment === 'sold'
    let writtenOff = segment === 'written-off'
    let title = sold ? 'Sold' : writtenOff ? 'Written-off' : 'Inventory'
    let readOnly = identity.inspecting != null
    let filtered = filter.name !== '' || filter.untagged || filter.tagIds.length > 0
    let listId = sold ? 'sold-list' : writtenOff ? 'written-off-list' : 'inventory-list'
    let selectable = !sold && !writtenOff && !readOnly

    let rows = flips.map((flip) => (
      <li key={flip.id} mix={ledgerRow} data-name={flip.name}>
        <div mix={rowInner}>
          {selectable ? (
            <label mix={pickLabel}>
              <input type="checkbox" name="flip" value={flip.id} />{' '}
              <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
            </label>
          ) : (
            <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
          )}
          <span mix={rowCost}>
            <Money
              cents={flip.item_cost + flip.tax_paid + flip.inbound_shipping}
              tone="flat"
            />
          </span>
        </div>
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
            href={inventoryHref('inventory', filter)}
            mix={segmentTab}
            aria-current={segment === 'inventory' ? 'page' : undefined}
          >
            Inventory
          </a>
          <a
            href={inventoryHref('sold', filter)}
            mix={segmentTab}
            aria-current={sold ? 'page' : undefined}
          >
            Sold
          </a>
          <a
            href={inventoryHref('written-off', filter)}
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
            {flips.length === 0 ? (
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
                  {rows}
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
                {rows}
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
          {`(function(){var i=document.getElementById('inventory-name-filter');var list=document.getElementById('inventory-list')||document.getElementById('sold-list')||document.getElementById('written-off-list');if(!i||!list)return;i.addEventListener('input',function(){var q=i.value.trim().toLowerCase();for(var n=0;n<list.children.length;n++){var li=list.children[n];var name=(li.getAttribute('data-name')||'').toLowerCase();li.hidden=q!==''&&name.indexOf(q)===-1;}});})();`}
        </script>
      </AppShell>
    )
  }
}

function selectedTag(filter: Filter, tagId: string): boolean {
  return filter.tagIds.includes(tagId) && !filter.untagged
}

function inventoryHref(segment: Segment, filter: Filter): string {
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

/* The whole row is a hit target for the checkbox; the name stays a link. */
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
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  minWidth: 0,
})

/* Acquisition cost anchors the right edge so the ledger reads as columns on
 * wide screens instead of a row of stranded names. */
const rowCost = css({
  flexShrink: 0,
  fontSize: '0.85rem',
  color: 'var(--muted)',
})

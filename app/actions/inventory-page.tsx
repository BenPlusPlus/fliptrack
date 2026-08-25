import type { Flip, Tag } from '../data/schema.ts'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/shell.tsx'
import {
  ctaRow,
  fieldStack,
  heading,
  inventoryItem,
  inventoryList,
  labelStyle,
  ghostAction,
  lead,
  primaryAction,
  tagList,
} from '../ui/styles.ts'

export function InventoryPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    flips: Flip[]
    bookTags: Tag[]
    filter: { name: string; tagIds: string[]; untagged: boolean }
    segment: 'inventory' | 'sold' | 'written-off'
  }
}) {
  return () => {
    let { identity, csrf, flips, bookTags, filter, segment } = handle.props
    let selected = new Set(filter.tagIds)
    let sold = segment === 'sold'
    let writtenOff = segment === 'written-off'
    let title = sold ? 'Sold' : writtenOff ? 'Written-off' : 'Inventory'
    let readOnly = identity.inspecting != null

    return (
      <AppShell title={title} identity={identity} csrf={csrf} current="inventory">
        <h1 mix={heading}>{title}</h1>
        <p>
          <a
            href={inventoryHref('inventory', filter)}
            aria-current={segment === 'inventory' ? 'page' : undefined}
          >
            Inventory
          </a>
          {' | '}
          <a href={inventoryHref('sold', filter)} aria-current={sold ? 'page' : undefined}>
            Sold
          </a>
          {' | '}
          <a
            href={inventoryHref('written-off', filter)}
            aria-current={writtenOff ? 'page' : undefined}
          >
            Written-off
          </a>
        </p>
        <form method="get" action={routes.inventory.href()} mix={fieldStack}>
          {sold ? <input type="hidden" name="segment" value="sold" /> : null}
          {writtenOff ? <input type="hidden" name="segment" value="written-off" /> : null}
          <label mix={labelStyle}>
            Name
            <input
              type="search"
              name="q"
              defaultValue={filter.name}
              autoComplete="off"
              id="inventory-name-filter"
            />
          </label>
          {bookTags.length > 0 ? (
            <fieldset>
              <legend mix={labelStyle}>Tags</legend>
              <ul mix={tagList}>
                {bookTags.map((tag) => (
                  <li key={tag.id}>
                    <label>
                      <input
                        type="checkbox"
                        name="tag"
                        value={tag.id}
                        defaultChecked={selected.has(tag.id) && !filter.untagged}
                      />
                      {tag.name}
                    </label>
                  </li>
                ))}
                <li>
                  <label>
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
        {flips.length === 0 ? (
          <p mix={lead}>
            {filter.name !== '' || filter.untagged || filter.tagIds.length > 0 ? (
              'No Flips match.'
            ) : sold ? (
              'No sold Flips yet.'
            ) : writtenOff ? (
              'No written-off Flips yet.'
            ) : (
              <>
                Nothing in Inventory yet.{' '}
                {readOnly ? null : (
                  <a href={routes.acquisitions.new.index.href()}>New Acquisition</a>
                )}
              </>
            )}
          </p>
        ) : sold || writtenOff ? (
          <ol mix={inventoryList} id={sold ? 'sold-list' : 'written-off-list'}>
            {flips.map((flip) => (
              <li key={flip.id} mix={inventoryItem} data-name={flip.name}>
                <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
              </li>
            ))}
          </ol>
        ) : (
          readOnly ? (
            <ol mix={inventoryList} id="inventory-list">
              {flips.map((flip) => (
                <li key={flip.id} mix={inventoryItem} data-name={flip.name}>
                  <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
                </li>
              ))}
            </ol>
          ) : (
          <form method="get" action={routes.sales.new.index.href()}>
            <ol mix={inventoryList} id="inventory-list">
              {flips.map((flip) => (
                <li key={flip.id} mix={inventoryItem} data-name={flip.name}>
                  <label>
                    <input type="checkbox" name="flip" value={flip.id} />{' '}
                    <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
                  </label>
                </li>
              ))}
            </ol>
            <p mix={ctaRow}>
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
            </p>
          </form>
          )
        )}
        {readOnly ? null : (
          <p mix={ctaRow}>
            <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
              New Acquisition
            </a>
          </p>
        )}
        <script>
          {`(function(){var i=document.getElementById('inventory-name-filter');var list=document.getElementById('inventory-list')||document.getElementById('sold-list')||document.getElementById('written-off-list');if(!i||!list)return;i.addEventListener('input',function(){var q=i.value.trim().toLowerCase();for(var n=0;n<list.children.length;n++){var li=list.children[n];var name=(li.getAttribute('data-name')||'').toLowerCase();li.hidden=q!==''&&name.indexOf(q)===-1;}});})();`}
        </script>
      </AppShell>
    )
  }
}

function inventoryHref(
  segment: 'inventory' | 'sold' | 'written-off',
  filter: { name: string; tagIds: string[]; untagged: boolean },
): string {
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

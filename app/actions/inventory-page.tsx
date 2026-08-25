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
    flips: Flip[]
    bookTags: Tag[]
    filter: { name: string; tagIds: string[]; untagged: boolean }
  }
}) {
  return () => {
    let { identity, flips, bookTags, filter } = handle.props
    let selected = new Set(filter.tagIds)

    return (
      <AppShell title="Inventory" identity={identity} current="inventory">
        <h1 mix={heading}>Inventory</h1>
        <form method="get" action={routes.inventory.href()} mix={fieldStack}>
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
            ) : (
              <>
                Nothing in Inventory yet.{' '}
                <a href={routes.acquisitions.new.index.href()}>New Acquisition</a>
              </>
            )}
          </p>
        ) : (
          <ol mix={inventoryList} id="inventory-list">
            {flips.map((flip) => (
              <li key={flip.id} mix={inventoryItem} data-name={flip.name}>
                <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
              </li>
            ))}
          </ol>
        )}
        <p mix={ctaRow}>
          <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
            New Acquisition
          </a>
        </p>
        <script>
          {`(function(){var i=document.getElementById('inventory-name-filter');var list=document.getElementById('inventory-list');if(!i||!list)return;i.addEventListener('input',function(){var q=i.value.trim().toLowerCase();for(var n=0;n<list.children.length;n++){var li=list.children[n];var name=(li.getAttribute('data-name')||'').toLowerCase();li.hidden=q!==''&&name.indexOf(q)===-1;}});})();`}
        </script>
      </AppShell>
    )
  }
}

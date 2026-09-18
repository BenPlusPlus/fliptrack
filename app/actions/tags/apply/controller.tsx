import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  attachNamedTagToFlip,
  listTagsInBooks,
  loadKitFlips,
  type KitFlip,
} from '../../../data/queries.ts'
import type { Tag } from '../../../data/schema.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import { PageHeader, Receipt, SectionLabel } from '../../../ui/components.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  labelStyle,
  ledgerList,
  ledgerRow,
  leaveRow,
  primaryAction,
  splitLayout,
  stackGap,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
import {
  inventoryFilterFrom,
  inventoryFilterFromRequest,
  inventoryHref,
  type InventoryFilter,
} from '../../inventory-href.ts'

const KIT_OPTIONS = {
  emptyError: 'Pick Inventory Flips to tag.',
  notInventoryError: 'Tag from Inventory Flips only.',
}

export default createController(routes.tags.apply, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flipIds = context.url.searchParams.getAll('flip')
      let kit = await loadKitFlips(db, {
        booksId: identity.booksId,
        flipIds,
        ...KIT_OPTIONS,
      })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }
      let bookTags = await listTagsInBooks(db, identity.booksId)
      let filter = inventoryFilterFrom(context.url.searchParams)
      return context.render(
        <ApplyTagPage
          identity={identity}
          csrf={getCsrfToken(context)}
          kit={kit.kit}
          bookTags={bookTags}
          filter={filter}
        />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let formData = context.get(FormData)
      let flipIds = flipIdsFromRequest(formData, context.url)
      let kit = await loadKitFlips(db, {
        booksId: identity.booksId,
        flipIds,
        ...KIT_OPTIONS,
      })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }

      let filter = inventoryFilterFromRequest(formData, context.url)
      let name = String(formData.get('name') ?? '').trim()
      if (name === '') {
        let bookTags = await listTagsInBooks(db, identity.booksId)
        return context.render(
          <ApplyTagPage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={kit.kit}
            bookTags={bookTags}
            filter={filter}
            error="Tag name is required."
          />,
          { status: 400 },
        )
      }

      for (let row of kit.kit) {
        await attachNamedTagToFlip(db, {
          flipId: row.flip.id,
          booksId: identity.booksId,
          name,
        })
      }

      return redirect(inventoryHref('inventory', filter, ''), 303)
    },
  },
})

function ApplyTagPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    kit: KitFlip[]
    bookTags: Tag[]
    filter: InventoryFilter
    error?: string
  }
}) {
  return () => {
    let { identity, csrf, kit, bookTags, filter, error } = handle.props
    let returnHref = inventoryHref('inventory', filter, '')

    return (
      <AppShell title="Tag" identity={identity} csrf={csrf} current="inventory">
        <PageHeader title="Tag" />
        <div mix={splitLayout}>
          <div mix={stackGap}>
            <SectionLabel>Flips</SectionLabel>
            <ul mix={ledgerList}>
              {kit.map((row) => (
                <li key={row.flip.id} mix={ledgerRow}>
                  {row.flip.name}
                </li>
              ))}
            </ul>
          </div>
          <Receipt>
            {error ? <p mix={errorBanner}>{error}</p> : null}
            <form method="post" action={routes.tags.apply.action.href()} mix={fieldStack}>
              <input type="hidden" name="_csrf" value={csrf} />
              {kit.map((row) => (
                <input key={row.flip.id} type="hidden" name="flip" value={row.flip.id} />
              ))}
              {filter.name !== '' ? <input type="hidden" name="q" value={filter.name} /> : null}
              {filter.untagged ? <input type="hidden" name="untagged" value="1" /> : null}
              {filter.untagged
                ? null
                : filter.tagIds.map((tagId) => (
                    <input key={tagId} type="hidden" name="tag" value={tagId} />
                  ))}
              <label mix={labelStyle}>
                Tag
                <input
                  type="text"
                  name="name"
                  list="tag-names"
                  autoComplete="off"
                />
              </label>
              <datalist id="tag-names">
                {bookTags.map((tag) => (
                  <option key={tag.id} value={tag.name}></option>
                ))}
              </datalist>
              {identity.inspecting ? null : (
                <button type="submit" mix={primaryAction}>
                  Apply
                </button>
              )}
            </form>
            <p mix={leaveRow}>
              <a href={returnHref} mix={ghostAction}>
                Cancel
              </a>
            </p>
          </Receipt>
        </div>
      </AppShell>
    )
  }
}

function flipIdsFromRequest(formData: FormData, url: URL): string[] {
  let ids = [...formData.getAll('flip'), ...url.searchParams.getAll('flip')]
    .map((value) => String(value).trim())
    .filter(Boolean)
  return [...new Set(ids)]
}

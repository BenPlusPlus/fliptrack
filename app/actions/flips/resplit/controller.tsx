import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  findFlipInBooks,
  flipHasLiveListing,
  flipHasStandingSale,
  flipHasStandingWriteOff,
  resplitFlip,
} from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import type { Flip } from '../../../data/schema.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import { mustGet } from '../../../utils/context.ts'
import { parseResplitChildren } from '../../../utils/resplit.ts'
import { ResplitForm } from './public/resplit-form.tsx'

export default createController(routes.flips.resplit, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flip = await findFlipInBooks(db, {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (
        !flip ||
        flip.retired ||
        (await flipHasStandingSale(db, flip.id)) ||
        (await flipHasStandingWriteOff(db, flip.id)) ||
        (await flipHasLiveListing(db, flip.id))
      ) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <ResplitPage identity={identity} csrf={getCsrfToken(context)} parent={flip} />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flip = await findFlipInBooks(db, {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!flip || flip.retired) {
        return new Response('Not Found', { status: 404 })
      }

      let formData = context.get(FormData)
      let parsed = parseResplitChildren(formData)
      if (!parsed.ok) {
        return context.render(
          <ResplitPage
            identity={identity}
            csrf={getCsrfToken(context)}
            parent={flip}
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await resplitFlip(db, {
        parentId: flip.id,
        booksId: identity.booksId,
        children: parsed.children,
      })
      if (!result.ok) {
        return context.render(
          <ResplitPage
            identity={identity}
            csrf={getCsrfToken(context)}
            parent={flip}
            error={result.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      return redirect(routes.acquisitions.show.href({ acquisitionId: flip.acquisition_id }), 303)
    },
  },
})

function ResplitPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    parent: Flip
    error?: string
    values?: { name: string; itemCost: string }[]
  }
}) {
  return () => {
    let { identity, csrf, parent, error, values } = handle.props
    return (
      <AppShell title="Re-split" identity={identity} csrf={csrf} current="inventory">
        <ResplitForm
          csrf={csrf}
          action={routes.flips.resplit.action.href({ flipId: parent.id })}
          leaveHref={routes.flips.show.href({ flipId: parent.id })}
          inspecting={identity.inspecting != null}
          parentName={parent.name}
          parentItemCost={parent.item_cost}
          parentTaxPaid={parent.tax_paid}
          parentInboundShipping={parent.inbound_shipping}
          error={error}
          values={values}
        />
      </AppShell>
    )
  }
}

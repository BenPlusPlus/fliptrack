import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { loadUndoPreview, undoStandingForFlip } from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import type { UndoPreview } from '../../../data/queries.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import {
  fieldStack,
  ghostAction,
  heading,
  lead,
  leaveRow,
  mutedNote,
  primaryAction,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
import { formatCents } from '../../../utils/cents.ts'

export default createController(routes.flips.undo, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let preview = await loadUndoPreview(mustGet(context.get(databaseContext), 'database'), {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!preview) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <UndoPage identity={identity} csrf={getCsrfToken(context)} preview={preview} />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let result = await undoStandingForFlip(mustGet(context.get(databaseContext), 'database'), {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!result.ok) {
        return new Response(result.error, { status: result.status })
      }
      return redirect(routes.flips.show.href({ flipId: context.params.flipId }), 303)
    },
  },
})

function UndoPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    preview: UndoPreview
  }
}) {
  return () => {
    let { identity, csrf, preview } = handle.props
    return (
      <AppShell title="Undo" identity={identity} current="inventory">
        <h1 mix={heading}>Undo</h1>
        <p mix={lead}>
          {preview.flip.name}. Marketplace fee, Outbound shipping, and Supplies hitch. Proceeds do
          not hitch.
        </p>
        <p mix={mutedNote}>Marketplace fee {formatCents(preview.hitchMarketplaceFee)}</p>
        <p mix={mutedNote}>Outbound shipping {formatCents(preview.hitchOutboundShipping)}</p>
        <p mix={mutedNote}>Supplies {formatCents(preview.hitchSupplies)}</p>
        <form
          method="post"
          action={routes.flips.undo.action.href({ flipId: preview.flip.id })}
          mix={fieldStack}
        >
          <input type="hidden" name="_csrf" value={csrf} />
          <button type="submit" mix={primaryAction}>
            Undo
          </button>
        </form>
        <p mix={leaveRow}>
          <a href={routes.flips.show.href({ flipId: preview.flip.id })} mix={ghostAction}>
            Flip
          </a>
        </p>
      </AppShell>
    )
  }
}

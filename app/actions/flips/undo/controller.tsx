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
import { Stamp } from '../../../ui/components.tsx'
import {
  FONT_DISPLAY,
  FONT_MONEY,
  ghostAction,
  leaveRow,
  primaryAction,
  receipt,
} from '../../../ui/styles.ts'
import { css } from 'remix/ui'
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
    let hitchTotal =
      preview.hitchMarketplaceFee + preview.hitchOutboundShipping + preview.hitchSupplies
    return (
      <AppShell title="Undo" identity={identity} csrf={csrf} current="inventory">
        <div mix={confirmColumn}>
          <div mix={[receipt, warnCard]}>
            <div mix={warnHead}>
              <Stamp tone="loss">Undo</Stamp>
              <h1 mix={warnTitle}>{preview.flip.name}</h1>
            </div>
            <p mix={warnLead}>
              Marketplace fee, Outbound shipping, and Supplies hitch. Proceeds do not hitch.
            </p>
            <dl mix={hitchLedger}>
              <div mix={hitchRow}>
                <dt>Marketplace fee</dt>
                <dd mix={hitchAmount}>{formatCents(preview.hitchMarketplaceFee)}</dd>
              </div>
              <div mix={hitchRow}>
                <dt>Outbound shipping</dt>
                <dd mix={hitchAmount}>{formatCents(preview.hitchOutboundShipping)}</dd>
              </div>
              <div mix={hitchRow}>
                <dt>Supplies</dt>
                <dd mix={hitchAmount}>{formatCents(preview.hitchSupplies)}</dd>
              </div>
              <div mix={[hitchRow, hitchTotalRow]}>
                <dt>Stays with the Flip</dt>
                <dd mix={[hitchAmount, hitchTotalAmount]}>{formatCents(hitchTotal)}</dd>
              </div>
            </dl>
            {identity.inspecting ? null : (
              <form
                method="post"
                action={routes.flips.undo.action.href({ flipId: preview.flip.id })}
                mix={confirmForm}
              >
                <input type="hidden" name="_csrf" value={csrf} />
                <button type="submit" mix={primaryAction}>
                  Undo
                </button>
              </form>
            )}
            <p mix={leaveRow}>
              <a href={routes.flips.show.href({ flipId: preview.flip.id })} mix={ghostAction}>
                Flip
              </a>
            </p>
          </div>
        </div>
      </AppShell>
    )
  }
}

/* ------------------------------- local styles ----------------------------- */

/* A single decision on the page, so it gets a narrow centred column at every
 * width rather than stretching across the desktop content area. */
const confirmColumn = css({
  display: 'grid',
  justifyContent: 'center',
  '@media (min-width: 48rem)': { paddingTop: '1.5rem' },
})

const warnCard = css({
  display: 'grid',
  gap: '0.9rem',
  width: 'min(30rem, 100%)',
  padding: '1.15rem 1.15rem 1.3rem',
  borderTop: '4px solid var(--loss)',
})

const warnHead = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.7rem',
})

const warnTitle = css({
  margin: 0,
  fontFamily: FONT_DISPLAY,
  fontSize: 'clamp(1.35rem, 5vw, 1.8rem)',
  fontWeight: 800,
  lineHeight: 1.1,
  letterSpacing: '-0.015em',
})

const warnLead = css({
  margin: 0,
  fontSize: '0.9rem',
  lineHeight: 1.55,
  color: 'var(--muted)',
})

const hitchLedger = css({
  display: 'grid',
  gap: 0,
  margin: 0,
  padding: 0,
})

const hitchRow = css({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.42rem 0',
  borderBottom: '1px dashed var(--rule)',
  '& dt': { margin: 0, fontSize: '0.86rem' },
  '& dd': { margin: 0 },
})

const hitchAmount = css({
  fontFamily: FONT_MONEY,
  fontSize: '0.92rem',
  fontVariantNumeric: 'tabular-nums',
})

const hitchTotalRow = css({
  borderBottom: 'none',
  borderTop: '2px solid var(--ink)',
  marginTop: '0.2rem',
  paddingTop: '0.55rem',
  '& dt': { fontWeight: 700 },
})

const hitchTotalAmount = css({
  fontSize: '1.05rem',
  fontWeight: 600,
  color: 'var(--loss)',
})

const confirmForm = css({ display: 'grid', gap: '0.6rem', marginTop: '0.2rem' })
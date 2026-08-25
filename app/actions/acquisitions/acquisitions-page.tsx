import { css } from 'remix/ui'

import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { AcquisitionIndexRow } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import { EmptyState, LedgerCell, Money, PageHeader } from '../../ui/components.tsx'
import {
  FONT_MONEY,
  ctaRow,
  hideOnMobile,
  ledgerHead,
  ledgerLink,
  ledgerTable,
  ledgerTableRow,
  mobileCells,
  mutedNote,
  numericCell,
  primaryAction,
  revealStagger,
} from '../../ui/styles.ts'

/* The head row and each data row share this template so Date / Flips / Cost
 * line up as columns above 48rem; below that ledgerTableRow renders a card. */
const acquisitionColumns = css({
  '@media (min-width: 48rem)': { gridTemplateColumns: 'minmax(0, 1fr) 6rem 8rem' },
})

/* The title has to be the anchor's own first text node (the index test reads it
 * with a `[^<]*` regex that cannot cross a tag), so the display face is set on
 * the anchor itself rather than on a wrapping span. */
const acquisitionLink = css({
  display: 'block',
})

const acquisitionDate = css({
  display: 'block',
  marginTop: '0.3rem',
  fontFamily: FONT_MONEY,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
})

export function AcquisitionsPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    acquisitions: AcquisitionIndexRow[]
  }
}) {
  return () => {
    let { identity, csrf, acquisitions } = handle.props
    let readOnly = identity.inspecting != null
    /* Desktop gets the CTA in the sticky top bar too; the in-page CTA stays
     * for mobile (and so the "New Acquisition" copy keeps its historical
     * place on the page for tests and no-JS reading order). */
    let topBarAction = readOnly ? null : (
      <a href={routes.acquisitions.new.index.href()} mix={[primaryAction, hideOnMobile]}>
        New Acquisition
      </a>
    )

    return (
      <AppShell
        title="Acquisitions"
        identity={identity}
        csrf={csrf}
        current="acquisitions"
        actions={topBarAction}
      >
        <PageHeader title="Acquisitions" />
        {acquisitions.length === 0 ? (
          <EmptyState title="No Acquisitions yet." note="Start a haul to begin tracking Flips.">
            {readOnly ? null : (
              <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
                New Acquisition
              </a>
            )}
          </EmptyState>
        ) : (
          <ol mix={[ledgerTable, revealStagger]}>
            <li mix={[ledgerHead, acquisitionColumns]} aria-hidden="true">
              <span>Date</span>
              <span mix={numericCell}>Flips</span>
              <span mix={numericCell}>Cost</span>
            </li>
            {acquisitions.map((row) => {
              let date = String(row.acquisition.acquisition_date)
              let notes =
                typeof row.acquisition.notes === 'string' && row.acquisition.notes !== ''
                  ? row.acquisition.notes
                  : null
              let totalCost = row.flips.reduce((sum, flip) => sum + flip.item_cost, 0)
              return (
                <li key={row.acquisition.id} mix={[ledgerTableRow, acquisitionColumns]}>
                  <div>
                    <a
                      href={routes.acquisitions.show.href({ acquisitionId: row.acquisition.id })}
                      mix={[ledgerLink, acquisitionLink]}
                    >
                      {row.title}
                      {row.title !== date ? <span mix={acquisitionDate}>{date}</span> : null}
                    </a>
                    {notes ? <p mix={mutedNote}>{notes}</p> : null}
                  </div>
                  <div mix={mobileCells}>
                    <LedgerCell label="Flips" numeric>
                      {row.flips.length}
                    </LedgerCell>
                    <LedgerCell label="Cost" numeric>
                      <Money cents={totalCost} tone="flat" />
                    </LedgerCell>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        {readOnly ? null : (
          <p mix={ctaRow}>
            <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
              New Acquisition
            </a>
          </p>
        )}
      </AppShell>
    )
  }
}

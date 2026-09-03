import { css } from 'remix/ui'

import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { Acquisition, Flip } from '../../data/schema.ts'
import { acquisitionCostCents } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  ActionStack,
  EmptyState,
  Money,
  PageHeader,
  Receipt,
  SectionLabel,
} from '../../ui/components.tsx'
import {
  dashRule,
  displayTitle,
  ghostAction,
  ledgerList,
  ledgerRow,
  moneyFlat,
  moneyMd,
  mutedNote,
  rowMain,
  sectionBlock,
  splitLayout,
} from '../../ui/styles.ts'

const costBreakdown = css({
  display: 'grid',
  gap: '0.45rem',
  margin: 0,
  padding: 0,
  '& dt, & dd': { margin: 0 },
})

const costLine = css({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '0.7rem',
  color: 'var(--muted)',
  fontSize: '0.93rem',
})

export function AcquisitionPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    acquisition: Acquisition
    title: string
    flips: Flip[]
  }
}) {
  return () => {
    let { identity, csrf, acquisition, title, flips } = handle.props
    let readOnly = identity.inspecting != null
    let date = String(acquisition.acquisition_date)
    let notes =
      typeof acquisition.notes === 'string' && acquisition.notes !== '' ? acquisition.notes : null
    let itemCost = 0
    let taxPaid = 0
    let inboundShipping = 0
    let acquisitionCost = 0
    for (let flip of flips) {
      itemCost += flip.item_cost
      taxPaid += flip.tax_paid
      inboundShipping += flip.inbound_shipping
      acquisitionCost += acquisitionCostCents(flip)
    }

    return (
      <AppShell title={title} identity={identity} csrf={csrf} current="acquisitions">
        <PageHeader title={title} />
        <div mix={splitLayout}>
          <Receipt>
            <SectionLabel>Haul date</SectionLabel>
            <p mix={displayTitle}>{date}</p>
            {title !== date ? <p mix={mutedNote}>{title}</p> : null}
            {notes ? <p mix={mutedNote}>{notes}</p> : null}
            <div mix={sectionBlock}>
              <SectionLabel>Flips</SectionLabel>
              <p mix={[moneyMd, moneyFlat]}>{flips.length}</p>
            </div>
            <div mix={sectionBlock}>
              <SectionLabel>Acquisition cost</SectionLabel>
              <Money cents={acquisitionCost} tone="flat" size="md" block />
              <hr mix={dashRule} />
              <dl mix={costBreakdown}>
                <div mix={costLine}>
                  <dt>Item cost</dt>
                  <dd>
                    <Money cents={itemCost} tone="flat" />
                  </dd>
                </div>
                <div mix={costLine}>
                  <dt>Tax paid</dt>
                  <dd>
                    <Money cents={taxPaid} tone="flat" />
                  </dd>
                </div>
                <div mix={costLine}>
                  <dt>Inbound shipping</dt>
                  <dd>
                    <Money cents={inboundShipping} tone="flat" />
                  </dd>
                </div>
              </dl>
            </div>
          </Receipt>
          <div>
            <SectionLabel>Flips in this haul</SectionLabel>
            {flips.length === 0 ? (
              <EmptyState title="No Flips yet." note="Add Flips to this Acquisition to start tracking them." />
            ) : (
              <ol mix={ledgerList}>
                {flips.map((flip) => (
                  <li key={flip.id} mix={ledgerRow}>
                    <div mix={rowMain}>
                      <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
                      <Money cents={flip.item_cost} tone="flat" />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        <ActionStack>
          {readOnly ? null : (
            <a
              href={routes.acquisitions.continue.index.href({ acquisitionId: acquisition.id })}
              mix={ghostAction}
            >
              Add Flips to this Acquisition
            </a>
          )}
          <a href={routes.acquisitions.index.href()} mix={ghostAction}>
            Acquisitions
          </a>
        </ActionStack>
      </AppShell>
    )
  }
}

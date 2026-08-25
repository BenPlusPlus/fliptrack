import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { Acquisition, Flip } from '../../data/schema.ts'
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
    let totalCost = flips.reduce((sum, flip) => sum + flip.item_cost, 0)

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
              <SectionLabel>Item cost</SectionLabel>
              <Money cents={totalCost} tone="flat" size="md" block />
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

import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { Acquisition, Flip } from '../../data/schema.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  ghostAction,
  heading,
  inventoryItem,
  inventoryList,
  lead,
  leaveRow,
  mutedNote,
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

    return (
      <AppShell title={title} identity={identity} csrf={csrf} current="acquisitions">
        <h1 mix={heading}>{title}</h1>
        {title !== date ? <p mix={lead}>{date}</p> : null}
        {notes ? <p mix={mutedNote}>{notes}</p> : null}
        {flips.length === 0 ? (
          <p mix={lead}>No Flips yet.</p>
        ) : (
          <ol mix={inventoryList}>
            {flips.map((flip) => (
              <li key={flip.id} mix={inventoryItem}>
                <a href={routes.flips.show.href({ flipId: flip.id })}>{flip.name}</a>
              </li>
            ))}
          </ol>
        )}
        {readOnly ? null : (
          <p mix={leaveRow}>
            <a
              href={routes.acquisitions.continue.index.href({ acquisitionId: acquisition.id })}
              mix={ghostAction}
            >
              Add Flips to this Acquisition
            </a>
          </p>
        )}
        <p mix={leaveRow}>
          <a href={routes.acquisitions.index.href()} mix={ghostAction}>
            Acquisitions
          </a>
        </p>
      </AppShell>
    )
  }
}

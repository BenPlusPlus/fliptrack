import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { AcquisitionIndexRow } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  ctaRow,
  heading,
  inventoryItem,
  inventoryList,
  lead,
  mutedNote,
  primaryAction,
} from '../../ui/styles.ts'

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

    return (
      <AppShell title="Acquisitions" identity={identity} csrf={csrf} current="acquisitions">
        <h1 mix={heading}>Acquisitions</h1>
        {acquisitions.length === 0 ? (
          <p mix={lead}>
            No Acquisitions yet.{' '}
            {readOnly ? null : (
              <a href={routes.acquisitions.new.index.href()}>New Acquisition</a>
            )}
          </p>
        ) : (
          <ol mix={inventoryList}>
            {acquisitions.map((row) => {
              let date = String(row.acquisition.acquisition_date)
              let notes =
                typeof row.acquisition.notes === 'string' && row.acquisition.notes !== ''
                  ? row.acquisition.notes
                  : null
              return (
                <li key={row.acquisition.id} mix={inventoryItem}>
                  <a href={routes.acquisitions.show.href({ acquisitionId: row.acquisition.id })}>
                    {row.title}
                  </a>
                  {row.title !== date ? (
                    <p mix={mutedNote}>
                      {date}
                      {notes ? ` · ${notes}` : ''}
                    </p>
                  ) : notes ? (
                    <p mix={mutedNote}>{notes}</p>
                  ) : null}
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

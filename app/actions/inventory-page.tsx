import type { Flip } from '../data/schema.ts'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/shell.tsx'
import {
  ctaRow,
  heading,
  inventoryItem,
  inventoryList,
  lead,
  primaryAction,
} from '../ui/styles.ts'

export function InventoryPage(handle: { props: { identity: OperatorIdentity; flips: Flip[] } }) {
  return () => {
    let { identity, flips } = handle.props

    return (
      <AppShell title="Inventory" identity={identity} current="inventory">
        <h1 mix={heading}>Inventory</h1>
        {flips.length === 0 ? (
          <p mix={lead}>
            Nothing in Inventory yet.{' '}
            <a href={routes.acquisitions.new.index.href()}>New Acquisition</a>
          </p>
        ) : (
          <ol mix={inventoryList}>
            {flips.map((flip) => (
              <li key={flip.id} mix={inventoryItem}>
                {flip.name}
              </li>
            ))}
          </ol>
        )}
        <p mix={ctaRow}>
          <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
            New Acquisition
          </a>
        </p>
      </AppShell>
    )
  }
}

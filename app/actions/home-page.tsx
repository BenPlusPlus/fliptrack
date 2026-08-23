import { formatCents } from '../utils/cents.ts'
import { routes } from '../routes.ts'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { AppShell } from '../ui/shell.tsx'
import {
  ctaRow,
  inventoryValue,
  mutedNote,
  primaryAction,
  profitGrid,
  sectionLabel,
  stampAmount,
  stampLabel,
  ticket,
  windowValue,
} from '../ui/styles.ts'

export function HomePage(handle: {
  props: { identity: OperatorIdentity; inventoryCents: number }
}) {
  return () => {
    let { identity, inventoryCents } = handle.props

    return (
      <AppShell title="Home" identity={identity} current="home">
        <p mix={sectionLabel}>Profit</p>
        <div mix={profitGrid}>
          <ProfitStamp label="This Week" amount={formatCents(0)} />
          <ProfitStamp label="This Month" amount={formatCents(0)} />
          <ProfitStamp label="This Year" amount={formatCents(0)} />
        </div>
        <div mix={ticket}>
          <p mix={sectionLabel}>Inventory</p>
          <p mix={[stampAmount, inventoryValue]}>{formatCents(inventoryCents)}</p>
          <p mix={mutedNote}>Acquisition cost</p>
        </div>
        <p mix={ctaRow}>
          <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
            New Acquisition
          </a>
        </p>
      </AppShell>
    )
  }
}

function ProfitStamp(handle: { props: { label: string; amount: string } }) {
  return () => (
    <div mix={ticket}>
      <p mix={stampLabel}>{handle.props.label}</p>
      <p mix={[stampAmount, windowValue]}>{handle.props.amount}</p>
    </div>
  )
}

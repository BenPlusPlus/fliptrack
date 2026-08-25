import { formatCents } from '../utils/cents.ts'
import { routes } from '../routes.ts'
import type { OperatorIdentity } from '../middleware/auth.ts'
import type { HomePnl } from '../data/queries.ts'
import type { ProfitWindowKind } from '../utils/calendar.ts'
import { AppShell } from '../ui/shell.tsx'
import {
  ctaRow,
  inventoryList,
  inventoryItem,
  inventoryValue,
  mutedNote,
  primaryAction,
  profitGrid,
  profitStampLink,
  sectionLabel,
  stampAmount,
  stampLabel,
  ticket,
  windowValue,
} from '../ui/styles.ts'

export function HomePage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    pnl: HomePnl
    window: ProfitWindowKind
    today: string
    weekStart: number
  }
}) {
  return () => {
    let { identity, csrf, pnl, window: selected, today, weekStart } = handle.props
    let readOnly = identity.inspecting != null

    return (
      <AppShell title="Home" identity={identity} csrf={csrf} current="home">
        <p mix={sectionLabel}>Profit</p>
        <div mix={profitGrid}>
          <ProfitStamp
            label="This Week"
            amount={formatCents(pnl.weekProfitCents)}
            href={homeWindowHref('week', today, weekStart)}
            selected={selected === 'week'}
          />
          <ProfitStamp
            label="This Month"
            amount={formatCents(pnl.monthProfitCents)}
            href={homeWindowHref('month', today, weekStart)}
            selected={selected === 'month'}
          />
          <ProfitStamp
            label="This Year"
            amount={formatCents(pnl.yearProfitCents)}
            href={homeWindowHref('year', today, weekStart)}
            selected={selected === 'year'}
          />
        </div>
        <div mix={ticket}>
          <p mix={sectionLabel}>Inventory</p>
          <p mix={[stampAmount, inventoryValue]}>{formatCents(pnl.inventoryCents)}</p>
          <p mix={mutedNote}>Acquisition cost</p>
        </div>
        {pnl.slices.length > 0 ? (
          <section>
            <p mix={sectionLabel}>Tag slices</p>
            <ul mix={inventoryList}>
              {pnl.slices.map((slice) => (
                <li key={slice.untagged ? 'untagged' : slice.name} mix={inventoryItem} data-slice={slice.name}>
                  <p>{slice.name}</p>
                  <p>Profit {formatCents(slice.profitCents)}</p>
                  <p>Sold {slice.soldCount}</p>
                  <p>Written-off {slice.writtenOffCount}</p>
                  <p>Inventory {formatCents(slice.inventoryCents)}</p>
                  <p>Unsold {slice.unsoldCount}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {readOnly ? null : (
          <p mix={ctaRow}>
            <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
              New Acquisition
            </a>
          </p>
        )}
        <script>
          {`(function(){var u=new URL(location.href);if(u.searchParams.get('today'))return;var d=new Date();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');u.searchParams.set('today',d.getFullYear()+'-'+m+'-'+day);var weekStart=0;try{var loc=new Intl.Locale(navigator.language);var info=loc.weekInfo||(loc.getWeekInfo&&loc.getWeekInfo());if(info&&info.firstDay!=null){weekStart=info.firstDay===7?0:info.firstDay;}}catch(e){}u.searchParams.set('weekStart',String(weekStart));location.replace(u.pathname+u.search);})();`}
        </script>
      </AppShell>
    )
  }
}

function homeWindowHref(kind: ProfitWindowKind, today: string, weekStart: number): string {
  return `${routes.home.href()}?window=${kind}&today=${today}&weekStart=${weekStart}`
}

function ProfitStamp(handle: {
  props: { label: string; amount: string; href: string; selected: boolean }
}) {
  return () => (
    <a
      href={handle.props.href}
      mix={[ticket, profitStampLink]}
      aria-current={handle.props.selected ? 'true' : undefined}
    >
      <p mix={stampLabel}>{handle.props.label}</p>
      <p mix={[stampAmount, windowValue]}>{handle.props.amount}</p>
    </a>
  )
}

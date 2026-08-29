import type { Handle, RemixNode } from 'remix/ui'

import { Document } from './document.tsx'
import {
  IconAccount,
  IconAcquisitions,
  IconAdmin,
  IconHome,
  IconInventory,
  IconListings,
} from './components.tsx'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import {
  appFrame,
  appMain,
  contentColumn,
  focusColumn,
  focusColumnWide,
  hideOnDesktop,
  hideOnMobile,
  inspectBanner,
  navBrand,
  navFooter,
  navLink,
  navRoot,
  navSpacer,
  topBar,
  topBarActions,
  topBarInner,
  topBarTitle,
  wordmark,
} from './styles.ts'

export type NavKey = 'home' | 'inventory' | 'acquisitions' | 'listings' | 'account' | 'admin'

/**
 * One set of markup, three shapes. Under 48rem the books nav is a fixed
 * ticket-stub strip along the bottom; between 48 and 64rem it is an icon rail;
 * above that it is a full sidebar and the top bar becomes a page-title bar.
 */
export function AppShell(
  handle: Handle<{
    title: string
    identity?: OperatorIdentity | null
    csrf?: string
    current?: NavKey
    hideNav?: boolean
    wideFocus?: boolean
    actions?: RemixNode
    children?: RemixNode
  }>,
) {
  return () => {
    let { title, identity, csrf, current, hideNav, wideFocus, actions, children } = handle.props
    let inspecting = identity?.inspecting
    let showNav = identity != null && !hideNav
    let homeHref = identity ? routes.home.href() : routes.login.index.href()
    let column =
      identity != null && hideNav ? (wideFocus ? focusColumnWide : focusColumn) : contentColumn

    return (
      <Document title={`${title} · Fliptrack`}>
        <div mix={showNav ? appFrame : undefined}>
          {showNav && identity ? <BooksNav identity={identity} current={current} /> : null}
          <div mix={appMain}>
            <header mix={topBar}>
              <div mix={topBarInner}>
                <a href={homeHref} mix={[wordmark, showNav ? hideOnDesktop : undefined]}>
                  Fliptrack
                </a>
                {showNav ? (
                  <p mix={[topBarTitle, hideOnMobile]}>{title}</p>
                ) : null}
                {actions ? <div mix={[topBarActions, hideOnMobile]}>{actions}</div> : null}
              </div>
            </header>
            <main mix={column}>
              {inspecting ? (
                <div mix={inspectBanner} role="status">
                  <span>Viewing {inspecting.email} — read only</span>
                  {csrf ? (
                    <form method="post" action={routes.admin.leave.href()}>
                      <input type="hidden" name="_csrf" value={csrf} />
                      <button type="submit">Leave inspector</button>
                    </form>
                  ) : null}
                </div>
              ) : null}
              {children}
            </main>
          </div>
        </div>
      </Document>
    )
  }
}

function BooksNav(handle: Handle<{ identity: OperatorIdentity; current?: NavKey }>) {
  return () => {
    let { identity, current } = handle.props

    return (
      <nav aria-label="Books" mix={navRoot}>
        <div mix={navBrand}>
          <a href={routes.home.href()} mix={wordmark}>
            Fliptrack
          </a>
        </div>
        <NavTab
          href={routes.home.href()}
          label="Home"
          active={current === 'home'}
          icon={<IconHome />}
        />
        <NavTab
          href={routes.inventory.href()}
          label="Inventory"
          active={current === 'inventory'}
          icon={<IconInventory />}
        />
        <NavTab
          href={routes.acquisitions.index.href()}
          label="Acquisitions"
          active={current === 'acquisitions'}
          icon={<IconAcquisitions />}
        />
        <NavTab
          href={routes.listings.index.href()}
          label="Listings"
          active={current === 'listings'}
          icon={<IconListings />}
        />
        <NavTab
          href={routes.account.href()}
          label="Account"
          active={current === 'account'}
          icon={<IconAccount />}
        />
        {identity.instanceAdmin ? (
          <NavTab
            href={routes.admin.index.href()}
            label="Admin"
            active={current === 'admin'}
            icon={<IconAdmin />}
          />
        ) : null}
        <div mix={navSpacer}></div>
        <p mix={navFooter}>{identity.inspecting ? identity.inspecting.email : identity.email}</p>
      </nav>
    )
  }
}

function NavTab(
  handle: Handle<{ href: string; label: string; active: boolean; icon: RemixNode }>,
) {
  return () => {
    let { href, label, active, icon } = handle.props
    return (
      <a href={href} mix={navLink} aria-current={active ? 'page' : undefined}>
        {icon}
        <span>{label}</span>
      </a>
    )
  }
}

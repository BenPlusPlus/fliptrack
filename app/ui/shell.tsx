import type { Handle, RemixNode } from 'remix/ui'

import { Document } from './document.tsx'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import {
  bottomNav,
  bottomNavAdmin,
  headerBar,
  headerBarRuled,
  inspectBanner,
  page,
  wordmark,
} from './styles.ts'

export function AppShell(
  handle: Handle<{
    title: string
    identity?: OperatorIdentity | null
    csrf?: string
    current?: 'home' | 'inventory' | 'acquisitions' | 'listings' | 'account' | 'admin'
    hideNav?: boolean
    children?: RemixNode
  }>,
) {
  return () => {
    let { title, identity, csrf, current, hideNav, children } = handle.props
    let inspecting = identity?.inspecting

    return (
      <Document title={`${title} · Fliptrack`}>
        <header mix={identity ? [headerBar, headerBarRuled] : headerBar}>
          <a href={identity ? routes.home.href() : routes.login.index.href()} mix={wordmark}>
            Fliptrack
          </a>
        </header>
        <main mix={page}>
          {inspecting && csrf ? (
            <div mix={inspectBanner} role="status">
              <span>
                Viewing {inspecting.email} — read only
              </span>
              <form method="post" action={routes.admin.leave.href()}>
                <input type="hidden" name="_csrf" value={csrf} />
                <button type="submit">Leave inspector</button>
              </form>
            </div>
          ) : inspecting ? (
            <div mix={inspectBanner} role="status">
              Viewing {inspecting.email} — read only
            </div>
          ) : null}
          {children}
        </main>
        {identity && !hideNav ? (
          <nav
            aria-label="Books"
            mix={identity.instanceAdmin ? [bottomNav, bottomNavAdmin] : bottomNav}
          >
            <a href={routes.home.href()} aria-current={current === 'home' ? 'page' : undefined}>
              Home
            </a>
            <a
              href={routes.inventory.href()}
              aria-current={current === 'inventory' ? 'page' : undefined}
            >
              Inventory
            </a>
            <a
              href={routes.acquisitions.index.href()}
              aria-current={current === 'acquisitions' ? 'page' : undefined}
            >
              Acquisitions
            </a>
            <a
              href={routes.listings.index.href()}
              aria-current={current === 'listings' ? 'page' : undefined}
            >
              Listings
            </a>
            <a
              href={routes.account.href()}
              aria-current={current === 'account' ? 'page' : undefined}
            >
              Account
            </a>
            {identity.instanceAdmin ? (
              <a
                href={routes.admin.index.href()}
                aria-current={current === 'admin' ? 'page' : undefined}
              >
                Admin
              </a>
            ) : null}
          </nav>
        ) : null}
      </Document>
    )
  }
}

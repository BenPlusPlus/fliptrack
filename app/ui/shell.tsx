import type { Handle, RemixNode } from 'remix/ui'

import { Document } from './document.tsx'
import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { bottomNav, headerBar, headerBarRuled, page, wordmark } from './styles.ts'

export function AppShell(
  handle: Handle<{
    title: string
    identity?: OperatorIdentity | null
    current?: 'home' | 'inventory' | 'listings' | 'account'
    hideNav?: boolean
    children?: RemixNode
  }>,
) {
  return () => {
    let { title, identity, current, hideNav, children } = handle.props

    return (
      <Document title={`${title} · Fliptrack`}>
        <header mix={identity ? [headerBar, headerBarRuled] : headerBar}>
          <a href={identity ? routes.home.href() : routes.login.index.href()} mix={wordmark}>
            Fliptrack
          </a>
        </header>
        <main mix={page}>{children}</main>
        {identity && !hideNav ? (
          <nav aria-label="Books" mix={bottomNav}>
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
          </nav>
        ) : null}
      </Document>
    )
  }
}

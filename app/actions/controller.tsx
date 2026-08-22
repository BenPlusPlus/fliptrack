import { Session } from 'remix/session'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import { getCsrfToken } from 'remix/middleware/csrf'

import { assetServer } from '../assets.ts'
import { inventoryAcquisitionCostCents, listInventory } from '../data/queries.ts'
import { databaseContext } from '../middleware/database.ts'
import { operatorFrom, requireOperator } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { mustGet } from '../utils/context.ts'
import { AccountPage } from './account-page.tsx'
import { HomePage } from './home-page.tsx'
import { InventoryPage } from './inventory-page.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (
        (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
      )
    },

    home: {
      middleware: [requireOperator()],
      async handler(context) {
        let identity = operatorFrom(context)
        let inventoryCents = await inventoryAcquisitionCostCents(
          mustGet(context.get(databaseContext), 'database'),
          identity.booksId,
        )
        return context.render(<HomePage identity={identity} inventoryCents={inventoryCents} />)
      },
    },

    inventory: {
      middleware: [requireOperator()],
      async handler(context) {
        let identity = operatorFrom(context)
        let flips = await listInventory(
          mustGet(context.get(databaseContext), 'database'),
          identity.booksId,
        )
        return context.render(<InventoryPage identity={identity} flips={flips} />)
      },
    },

    account: {
      middleware: [requireOperator()],
      async handler(context) {
        let identity = operatorFrom(context)
        return context.render(<AccountPage identity={identity} csrf={getCsrfToken(context)} />)
      },
    },

    logout(context) {
      let session = context.get(Session)
      session.unset('auth')
      session.regenerateId(true)
      return redirect(routes.login.index.href(), 303)
    },
  },
})

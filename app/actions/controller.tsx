import { Session } from 'remix/session'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import { getCsrfToken } from 'remix/middleware/csrf'

import { assetServer } from '../assets.ts'
import {
  listChannelsInBooks,
  listInventory,
  listSold,
  listTagsInBooks,
  loadHomePnl,
} from '../data/queries.ts'
import {
  localToday,
  parseProfitWindow,
  parseTodayParam,
  parseWeekStart,
} from '../utils/calendar.ts'
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
        let today = parseTodayParam(context.url.searchParams.get('today')) ?? localToday()
        let weekStart = parseWeekStart(context.url.searchParams.get('weekStart'))
        let selectedWindow = parseProfitWindow(context.url.searchParams.get('window'))
        let pnl = await loadHomePnl(
          mustGet(context.get(databaseContext), 'database'),
          identity.booksId,
          { today, weekStart, window: selectedWindow },
        )
        return context.render(
          <HomePage
            identity={identity}
            pnl={pnl}
            window={selectedWindow}
            today={today}
            weekStart={weekStart}
          />,
        )
      },
    },

    inventory: {
      middleware: [requireOperator()],
      async handler(context) {
        let identity = operatorFrom(context)
        let db = mustGet(context.get(databaseContext), 'database')
        let name = context.url.searchParams.get('q') ?? ''
        let untagged = context.url.searchParams.get('untagged') === '1'
        let tagIds = untagged ? [] : context.url.searchParams.getAll('tag')
        let segment: 'inventory' | 'sold' =
          context.url.searchParams.get('segment') === 'sold' ? 'sold' : 'inventory'
        let [flips, bookTags] = await Promise.all([
          segment === 'sold'
            ? listSold(db, identity.booksId, { name, tagIds, untagged })
            : listInventory(db, identity.booksId, { name, tagIds, untagged }),
          listTagsInBooks(db, identity.booksId),
        ])
        return context.render(
          <InventoryPage
            identity={identity}
            flips={flips}
            bookTags={bookTags}
            filter={{ name, tagIds, untagged }}
            segment={segment}
          />,
        )
      },
    },

    account: {
      middleware: [requireOperator()],
      async handler(context) {
        let identity = operatorFrom(context)
        let db = mustGet(context.get(databaseContext), 'database')
        let [tags, channels] = await Promise.all([
          listTagsInBooks(db, identity.booksId),
          listChannelsInBooks(db, identity.booksId),
        ])
        return context.render(
          <AccountPage
            identity={identity}
            csrf={getCsrfToken(context)}
            tags={tags}
            channels={channels}
          />,
        )
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

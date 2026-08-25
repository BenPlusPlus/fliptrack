import { completeAuth } from 'remix/auth'
import { Session } from 'remix/session'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import { getCsrfToken } from 'remix/middleware/csrf'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { minLength } from 'remix/data-schema/checks'

import { assetServer } from '../assets.ts'
import {
  findOperatorById,
  listChannelsInBooks,
  listInventory,
  listSold,
  listTagsInBooks,
  listWrittenOff,
  loadHomePnl,
  replaceOperatorPassword,
} from '../data/queries.ts'
import {
  localToday,
  parseProfitWindow,
  parseTodayParam,
  parseWeekStart,
} from '../utils/calendar.ts'
import {
  operatorFrom,
  requireOperator,
  sessionAuthRecord,
} from '../middleware/auth.ts'
import { databaseContext } from '../middleware/database.ts'
import { routes } from '../routes.ts'
import { mustGet } from '../utils/context.ts'
import { hashPassword, verifyPassword } from '../utils/password.ts'
import { AccountPage } from './account-page.tsx'
import { HomePage } from './home-page.tsx'
import { InventoryPage } from './inventory-page.tsx'

let accountPasswordSchema = f.object({
  current_password: f.field(s.defaulted(s.string(), '')),
  password: f.field(s.defaulted(s.string(), '').pipe(minLength(8))),
})

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
            csrf={getCsrfToken(context)}
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
        let segmentParam = context.url.searchParams.get('segment')
        let segment: 'inventory' | 'sold' | 'written-off' =
          segmentParam === 'sold'
            ? 'sold'
            : segmentParam === 'written-off'
              ? 'written-off'
              : 'inventory'
        let [flips, bookTags] = await Promise.all([
          segment === 'sold'
            ? listSold(db, identity.booksId, { name, tagIds, untagged })
            : segment === 'written-off'
              ? listWrittenOff(db, identity.booksId, { name, tagIds, untagged })
              : listInventory(db, identity.booksId, { name, tagIds, untagged }),
          listTagsInBooks(db, identity.booksId),
        ])
        return context.render(
          <InventoryPage
            identity={identity}
            csrf={getCsrfToken(context)}
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

    accountPassword: {
      middleware: [requireOperator()],
      async handler(context) {
        let identity = operatorFrom(context)
        let db = mustGet(context.get(databaseContext), 'database')
        let csrf = getCsrfToken(context)
        let [tags, channels] = await Promise.all([
          listTagsInBooks(db, identity.booksId),
          listChannelsInBooks(db, identity.booksId),
        ])
        let parsed = s.parseSafe(accountPasswordSchema, context.get(FormData))
        if (!parsed.success) {
          return context.render(
            <AccountPage
              identity={identity}
              csrf={csrf}
              tags={tags}
              channels={channels}
              error="Enter a new password of at least 8 characters."
            />,
            { status: 400 },
          )
        }

        let operator = await findOperatorById(db, identity.id)
        if (
          !operator ||
          !(await verifyPassword(parsed.value.current_password, operator.password_hash))
        ) {
          return context.render(
            <AccountPage
              identity={identity}
              csrf={csrf}
              tags={tags}
              channels={channels}
              error="Current password is wrong."
            />,
            { status: 400 },
          )
        }

        let updated = await replaceOperatorPassword(db, {
          operatorId: identity.id,
          passwordHash: await hashPassword(parsed.value.password),
          mustChangePassword: false,
        })
        let session = completeAuth(context)
        session.set('auth', sessionAuthRecord(updated))
        return redirect(routes.account.href(), 303)
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

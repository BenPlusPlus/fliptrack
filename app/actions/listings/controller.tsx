import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  endListing,
  listListingsInBooks,
  loadListingHub,
  replaceListingFacts,
} from '../../data/queries.ts'
import { databaseContext } from '../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { mustGet } from '../../utils/context.ts'
import { parseListingForm } from './form.ts'
import { ListingPage } from './listing-page.tsx'
import { ListingsPage } from './listings-page.tsx'

export default createController(routes.listings, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let listings = await listListingsInBooks(
        mustGet(context.get(databaseContext), 'database'),
        identity.booksId,
      )
      return context.render(<ListingsPage identity={identity} listings={listings} />)
    },

    async show(context) {
      let identity = operatorFrom(context)
      let hub = await loadListingHub(mustGet(context.get(databaseContext), 'database'), {
        listingId: context.params.listingId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }
      return context.render(
        <ListingPage
          identity={identity}
          csrf={getCsrfToken(context)}
          listing={hub.listing}
          title={hub.title}
          flips={hub.flips}
          remainingInventory={hub.remainingInventory}
          spendFrozen={hub.spendFrozen}
          ended={hub.ended}
        />,
      )
    },

    async update(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let hub = await loadListingHub(db, {
        listingId: context.params.listingId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }

      let parsed = parseListingForm(context.get(FormData))
      if (!parsed.ok) {
        return context.render(
          <ListingPage
            identity={identity}
            csrf={getCsrfToken(context)}
            listing={hub.listing}
            title={hub.title}
            flips={hub.flips}
            remainingInventory={hub.remainingInventory}
            spendFrozen={hub.spendFrozen}
            ended={hub.ended}
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await replaceListingFacts(db, {
        listingId: hub.listing.id,
        booksId: identity.booksId,
        listingSpend: parsed.listingSpend,
        notes: parsed.notes ?? '',
      })
      if (!result.ok) {
        return context.render(
          <ListingPage
            identity={identity}
            csrf={getCsrfToken(context)}
            listing={hub.listing}
            title={hub.title}
            flips={hub.flips}
            remainingInventory={hub.remainingInventory}
            spendFrozen={hub.spendFrozen}
            ended={hub.ended}
            error={result.error}
            values={parsed.values}
          />,
          { status: result.status },
        )
      }

      return redirect(routes.listings.show.href({ listingId: hub.listing.id }), 303)
    },

    async end(context) {
      let identity = operatorFrom(context)
      let result = await endListing(mustGet(context.get(databaseContext), 'database'), {
        listingId: context.params.listingId,
        booksId: identity.booksId,
      })
      if (!result.ok) {
        return new Response(result.error, { status: result.status })
      }
      return redirect(routes.listings.show.href({ listingId: result.listing.id }), 303)
    },
  },
})

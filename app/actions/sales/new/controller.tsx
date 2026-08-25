import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  createSale,
  listChannelsInBooks,
  loadKitFlips,
} from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import { routes } from '../../../routes.ts'
import { mustGet } from '../../../utils/context.ts'
import { flipIdsFromRequest, parseSaleForm } from '../form.ts'
import { SalePage } from '../sale-page.tsx'

export default createController(routes.sales.new, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flipIds = context.url.searchParams.getAll('flip')
      let kit = await loadKitFlips(db, { booksId: identity.booksId, flipIds })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }
      let channels = await listChannelsInBooks(db, identity.booksId)
      return context.render(
        <SalePage
          identity={identity}
          csrf={getCsrfToken(context)}
          kit={kit.kit}
          channels={channels}
          action={routes.sales.new.action.href()}
          includeFlipIds
        />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let formData = context.get(FormData)
      let flipIds = flipIdsFromRequest(formData, context.url)
      let parsed = parseSaleForm(formData)
      let kit = await loadKitFlips(db, { booksId: identity.booksId, flipIds })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }
      let channels = await listChannelsInBooks(db, identity.booksId)

      if (!parsed.ok) {
        return context.render(
          <SalePage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={kit.kit}
            channels={channels}
            action={routes.sales.new.action.href()}
            includeFlipIds
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await createSale(db, {
        booksId: identity.booksId,
        flipIds,
        channelName: parsed.parsed.channel,
        saleDate: parsed.parsed.saleDate,
        salePrice: parsed.parsed.salePrice,
        buyerPaidShipping: parsed.parsed.buyerPaidShipping,
        marketplaceFee: parsed.parsed.marketplaceFee,
        outboundShipping: parsed.parsed.outboundShipping,
        supplies: parsed.parsed.supplies,
        ...(parsed.parsed.notes ? { notes: parsed.parsed.notes } : {}),
      })
      if (!result.ok) {
        return context.render(
          <SalePage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={kit.kit}
            channels={channels}
            action={routes.sales.new.action.href()}
            includeFlipIds
            error={result.error}
            values={parsed.values}
          />,
          { status: result.status },
        )
      }

      return redirect(routes.sales.show.href({ saleId: result.sale.id }), 303)
    },
  },
})

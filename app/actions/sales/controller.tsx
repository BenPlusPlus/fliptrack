import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { loadSaleHub, replaceSale } from '../../data/queries.ts'
import { databaseContext } from '../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { mustGet } from '../../utils/context.ts'
import { parseSaleForm } from './form.ts'
import { SalePage, saleValuesFromRecord } from './sale-page.tsx'

export default createController(routes.sales, {
  middleware: [requireOperator()],
  actions: {
    async show(context) {
      let identity = operatorFrom(context)
      let hub = await loadSaleHub(mustGet(context.get(databaseContext), 'database'), {
        saleId: context.params.saleId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <SalePage
          identity={identity}
          csrf={getCsrfToken(context)}
          kit={hub.kit}
          channels={hub.bookChannels}
          action={routes.sales.update.href({ saleId: hub.sale.id })}
          values={saleValuesFromRecord({
            channel: hub.channel.name,
            salePrice: hub.sale.sale_price,
            buyerPaidShipping: hub.sale.buyer_paid_shipping,
            marketplaceFee: hub.sale.marketplace_fee,
            outboundShipping: hub.sale.outbound_shipping,
            supplies: hub.sale.supplies,
            saleDate: String(hub.sale.sale_date),
            notes: hub.sale.notes,
          })}
        />,
      )
    },

    async update(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let hub = await loadSaleHub(db, {
        saleId: context.params.saleId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }

      let parsed = parseSaleForm(context.get(FormData))
      if (!parsed.ok) {
        return context.render(
          <SalePage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={hub.kit}
            channels={hub.bookChannels}
            action={routes.sales.update.href({ saleId: hub.sale.id })}
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await replaceSale(db, {
        saleId: hub.sale.id,
        booksId: identity.booksId,
        channelName: parsed.parsed.channel,
        saleDate: parsed.parsed.saleDate,
        salePrice: parsed.parsed.salePrice,
        buyerPaidShipping: parsed.parsed.buyerPaidShipping,
        marketplaceFee: parsed.parsed.marketplaceFee,
        outboundShipping: parsed.parsed.outboundShipping,
        supplies: parsed.parsed.supplies,
        notes: parsed.parsed.notes ?? '',
      })
      if (!result.ok) {
        return context.render(
          <SalePage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={hub.kit}
            channels={hub.bookChannels}
            action={routes.sales.update.href({ saleId: hub.sale.id })}
            error={result.error}
            values={parsed.values}
          />,
          { status: result.status },
        )
      }

      return redirect(routes.sales.show.href({ saleId: hub.sale.id }), 303)
    },
  },
})

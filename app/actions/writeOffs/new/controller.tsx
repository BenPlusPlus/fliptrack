import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  acquisitionCostCents,
  createWriteOff,
  listInventory,
  loadKitFlips,
} from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import { routes } from '../../../routes.ts'
import { mustGet } from '../../../utils/context.ts'
import { flipIdsFromRequest, parseWriteOffForm } from '../form.ts'
import { WriteOffPage } from '../write-off-page.tsx'

const KIT_OPTIONS = {
  emptyError: 'Pick Inventory Flips to write off.',
  notInventoryError: 'Write-off from Inventory Flips only.',
  requireNoLiveListing: true,
  liveListingError: 'A live Listing blocks Write-off. End the Listing first.',
}

export default createController(routes.writeOffs.new, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flipIds = context.url.searchParams.getAll('flip')
      let kit = await loadKitFlips(db, {
        booksId: identity.booksId,
        flipIds,
        ...KIT_OPTIONS,
      })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }
      let inventoryFlips = await listInventory(db, identity.booksId)
      return context.render(
        <WriteOffPage
          identity={identity}
          csrf={getCsrfToken(context)}
          kit={kit.kit}
          inventory={inventoryFlips.map((flip) => ({
            flip,
            acquisitionCostCents: acquisitionCostCents(flip),
          }))}
          selectedFlipIds={kit.kit.map((row) => row.flip.id)}
          action={routes.writeOffs.new.action.href()}
          includeFlipIds
        />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let formData = context.get(FormData)
      let flipIds = flipIdsFromRequest(formData, context.url)
      let parsed = parseWriteOffForm(formData)
      let kit = await loadKitFlips(db, {
        booksId: identity.booksId,
        flipIds,
        ...KIT_OPTIONS,
      })
      if (!kit.ok) {
        return new Response(kit.error, { status: kit.status })
      }
      let inventoryFlips = await listInventory(db, identity.booksId)
      let inventory = inventoryFlips.map((flip) => ({
        flip,
        acquisitionCostCents: acquisitionCostCents(flip),
      }))

      if (!parsed.ok) {
        return context.render(
          <WriteOffPage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={kit.kit}
            inventory={inventory}
            selectedFlipIds={flipIds}
            action={routes.writeOffs.new.action.href()}
            includeFlipIds
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await createWriteOff(db, {
        booksId: identity.booksId,
        flipIds,
        writeOffDate: parsed.parsed.writeOffDate,
        outboundShipping: parsed.parsed.outboundShipping,
        supplies: parsed.parsed.supplies,
        ...(parsed.parsed.notes ? { notes: parsed.parsed.notes } : {}),
      })
      if (!result.ok) {
        return context.render(
          <WriteOffPage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={kit.kit}
            inventory={inventory}
            selectedFlipIds={flipIds}
            action={routes.writeOffs.new.action.href()}
            includeFlipIds
            error={result.error}
            values={parsed.values}
          />,
          { status: result.status },
        )
      }

      return redirect(routes.writeOffs.show.href({ writeOffId: result.writeOff.id }), 303)
    },
  },
})

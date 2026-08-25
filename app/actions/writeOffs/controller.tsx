import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { loadWriteOffHub, replaceWriteOff } from '../../data/queries.ts'
import { databaseContext } from '../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { mustGet } from '../../utils/context.ts'
import { parseWriteOffForm } from './form.ts'
import { WriteOffPage, writeOffValuesFromRecord } from './write-off-page.tsx'

export default createController(routes.writeOffs, {
  middleware: [requireOperator()],
  actions: {
    async show(context) {
      let identity = operatorFrom(context)
      let hub = await loadWriteOffHub(mustGet(context.get(databaseContext), 'database'), {
        writeOffId: context.params.writeOffId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <WriteOffPage
          identity={identity}
          csrf={getCsrfToken(context)}
          kit={hub.kit}
          action={routes.writeOffs.update.href({ writeOffId: hub.writeOff.id })}
          values={writeOffValuesFromRecord({
            outboundShipping: hub.writeOff.outbound_shipping,
            supplies: hub.writeOff.supplies,
            writeOffDate: String(hub.writeOff.write_off_date),
            notes: hub.writeOff.notes,
          })}
        />,
      )
    },

    async update(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let hub = await loadWriteOffHub(db, {
        writeOffId: context.params.writeOffId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }

      let parsed = parseWriteOffForm(context.get(FormData))
      if (!parsed.ok) {
        return context.render(
          <WriteOffPage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={hub.kit}
            action={routes.writeOffs.update.href({ writeOffId: hub.writeOff.id })}
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await replaceWriteOff(db, {
        writeOffId: hub.writeOff.id,
        booksId: identity.booksId,
        writeOffDate: parsed.parsed.writeOffDate,
        outboundShipping: parsed.parsed.outboundShipping,
        supplies: parsed.parsed.supplies,
        notes: parsed.parsed.notes ?? '',
      })
      if (!result.ok) {
        return context.render(
          <WriteOffPage
            identity={identity}
            csrf={getCsrfToken(context)}
            kit={hub.kit}
            action={routes.writeOffs.update.href({ writeOffId: hub.writeOff.id })}
            error={result.error}
            values={parsed.values}
          />,
          { status: result.status },
        )
      }

      return redirect(routes.writeOffs.show.href({ writeOffId: hub.writeOff.id }), 303)
    },
  },
})

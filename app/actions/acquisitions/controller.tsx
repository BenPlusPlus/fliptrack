import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'

import { listAcquisitionsInBooks, loadAcquisitionHub } from '../../data/queries.ts'
import { databaseContext } from '../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { mustGet } from '../../utils/context.ts'
import { AcquisitionPage } from './acquisition-page.tsx'
import { AcquisitionsPage } from './acquisitions-page.tsx'

export default createController(routes.acquisitions, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let acquisitions = await listAcquisitionsInBooks(
        mustGet(context.get(databaseContext), 'database'),
        identity.booksId,
      )
      return context.render(
        <AcquisitionsPage
          identity={identity}
          csrf={getCsrfToken(context)}
          acquisitions={acquisitions}
        />,
      )
    },

    async show(context) {
      let identity = operatorFrom(context)
      let hub = await loadAcquisitionHub(mustGet(context.get(databaseContext), 'database'), {
        acquisitionId: context.params.acquisitionId,
        booksId: identity.booksId,
      })
      if (!hub) {
        return new Response('Not Found', { status: 404 })
      }
      return context.render(
        <AcquisitionPage
          identity={identity}
          csrf={getCsrfToken(context)}
          acquisition={hub.acquisition}
          title={hub.title}
          flips={hub.flips}
        />,
      )
    },
  },
})

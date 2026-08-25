import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { renameTag } from '../../data/queries.ts'
import { databaseContext } from '../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { mustGet } from '../../utils/context.ts'

export default createController(routes.tags, {
  middleware: [requireOperator()],
  actions: {
    async rename(context) {
      let identity = operatorFrom(context)
      let name = String(context.get(FormData).get('name') ?? '').trim()
      if (name === '') {
        return new Response('Tag name is required.', { status: 400 })
      }
      let result = await renameTag(mustGet(context.get(databaseContext), 'database'), {
        tagId: context.params.tagId,
        booksId: identity.booksId,
        name,
      })
      if (!result.ok) {
        return new Response(result.error, { status: result.status })
      }
      return redirect(routes.account.href(), 303)
    },
  },
})

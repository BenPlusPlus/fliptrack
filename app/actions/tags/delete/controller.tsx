import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { deleteTag, findTagInBooks } from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import {
  fieldStack,
  ghostAction,
  heading,
  lead,
  leaveRow,
  primaryAction,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'

export default createController(routes.tags.delete, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let tag = await findTagInBooks(mustGet(context.get(databaseContext), 'database'), {
        tagId: context.params.tagId,
        booksId: identity.booksId,
      })
      if (!tag) {
        return new Response('Not Found', { status: 404 })
      }
      return context.render(
        <DeleteTagPage identity={identity} csrf={getCsrfToken(context)} tag={tag} />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let result = await deleteTag(mustGet(context.get(databaseContext), 'database'), {
        tagId: context.params.tagId,
        booksId: identity.booksId,
      })
      if (!result.ok) {
        return new Response(result.error, { status: result.status })
      }
      return redirect(routes.account.href(), 303)
    },
  },
})

function DeleteTagPage(handle: {
  props: { identity: OperatorIdentity; csrf: string; tag: { id: string; name: string } }
}) {
  return () => {
    let { identity, csrf, tag } = handle.props
    return (
      <AppShell title="Delete Tag" identity={identity} current="account">
        <h1 mix={heading}>Delete {tag.name}?</h1>
        <p mix={lead}>This strips the Tag from every Flip. The Tag is then gone from the Books.</p>
        <form
          method="post"
          action={routes.tags.delete.action.href({ tagId: tag.id })}
          mix={fieldStack}
        >
          <input type="hidden" name="_csrf" value={csrf} />
          <button type="submit" mix={primaryAction}>
            Delete Tag
          </button>
        </form>
        <p mix={leaveRow}>
          <a href={routes.account.href()} mix={ghostAction}>
            Cancel
          </a>
        </p>
      </AppShell>
    )
  }
}

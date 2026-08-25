import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { deleteChannel, findChannelInBooks } from '../../../data/queries.ts'
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

export default createController(routes.channels.delete, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let channel = await findChannelInBooks(mustGet(context.get(databaseContext), 'database'), {
        channelId: context.params.channelId,
        booksId: identity.booksId,
      })
      if (!channel) {
        return new Response('Not Found', { status: 404 })
      }
      return context.render(
        <DeleteChannelPage identity={identity} csrf={getCsrfToken(context)} channel={channel} />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let result = await deleteChannel(mustGet(context.get(databaseContext), 'database'), {
        channelId: context.params.channelId,
        booksId: identity.booksId,
      })
      if (!result.ok) {
        return new Response(result.error, { status: result.status })
      }
      return redirect(routes.account.href(), 303)
    },
  },
})

function DeleteChannelPage(handle: {
  props: { identity: OperatorIdentity; csrf: string; channel: { id: string; name: string } }
}) {
  return () => {
    let { identity, csrf, channel } = handle.props
    return (
      <AppShell title="Delete Channel" identity={identity} csrf={csrf} current="account">
        <h1 mix={heading}>Delete {channel.name}?</h1>
        <p mix={lead}>Delete is refused if any Sale references this Channel.</p>
        {identity.inspecting ? null : (
          <form
            method="post"
            action={routes.channels.delete.action.href({ channelId: channel.id })}
            mix={fieldStack}
          >
            <input type="hidden" name="_csrf" value={csrf} />
            <button type="submit" mix={primaryAction}>
              Delete Channel
            </button>
          </form>
        )}
        <p mix={leaveRow}>
          <a href={routes.account.href()} mix={ghostAction}>
            Cancel
          </a>
        </p>
      </AppShell>
    )
  }
}

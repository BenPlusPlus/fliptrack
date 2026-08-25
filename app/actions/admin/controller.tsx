import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import { Session } from 'remix/session'

import {
  findOperatorById,
  getSignupOpen,
  listOperatorsByEmail,
  replaceOperatorPassword,
  setSignupOpen,
} from '../../data/queries.ts'
import {
  INSPECT_SESSION_KEY,
  REVEALED_TEMP_PASSWORD_KEY,
  operatorFrom,
  requireInstanceAdmin,
  requireOperator,
} from '../../middleware/auth.ts'
import { databaseContext } from '../../middleware/database.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  fieldStack,
  ghostAction,
  heading,
  inventoryItem,
  inventoryList,
  labelStyle,
  lead,
  mutedNote,
  tagSection,
} from '../../ui/styles.ts'
import { mustGet } from '../../utils/context.ts'
import { generateTempPassword, hashPassword } from '../../utils/password.ts'

type RevealedTempPassword = { email: string; password: string }

export default createController(routes.admin, {
  middleware: [requireOperator(), requireInstanceAdmin()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let session = context.get(Session)
      let revealed = session.get(REVEALED_TEMP_PASSWORD_KEY) as RevealedTempPassword | undefined
      if (revealed) {
        session.unset(REVEALED_TEMP_PASSWORD_KEY)
      }
      let [signupOpen, operators] = await Promise.all([
        getSignupOpen(db),
        listOperatorsByEmail(db),
      ])
      return context.render(
        <AdminPage
          identity={identity}
          csrf={getCsrfToken(context)}
          signupOpen={signupOpen}
          operators={operators.map((operator) => ({
            id: operator.id,
            email: operator.email,
            instanceAdmin: operator.instance_admin,
          }))}
          revealed={revealed}
        />,
      )
    },

    async signup(context) {
      let open = String(context.get(FormData).get('signup_open') ?? '') === '1'
      await setSignupOpen(mustGet(context.get(databaseContext), 'database'), open)
      return redirect(routes.admin.index.href(), 303)
    },

    async tempPassword(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let target = await findOperatorById(db, context.params.operatorId)
      if (!target) {
        return new Response('Not Found', { status: 404 })
      }
      if (target.id === identity.id) {
        return new Response('Set a temporary password on someone else.', { status: 400 })
      }

      let plaintext = generateTempPassword()
      await replaceOperatorPassword(db, {
        operatorId: target.id,
        passwordHash: await hashPassword(plaintext),
        mustChangePassword: true,
      })

      let session = context.get(Session)
      session.set(REVEALED_TEMP_PASSWORD_KEY, {
        email: target.email,
        password: plaintext,
      } satisfies RevealedTempPassword)
      return redirect(routes.admin.index.href(), 303)
    },

    async inspect(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let target = await findOperatorById(db, context.params.operatorId)
      if (!target) {
        return new Response('Not Found', { status: 404 })
      }
      if (target.id === identity.id) {
        return redirect(routes.home.href(), 303)
      }

      let session = context.get(Session)
      session.regenerateId(true)
      session.set(INSPECT_SESSION_KEY, target.id)
      return redirect(routes.home.href(), 303)
    },

    leave(context) {
      let session = context.get(Session)
      session.unset(INSPECT_SESSION_KEY)
      session.regenerateId(true)
      return redirect(routes.home.href(), 303)
    },
  },
})

function AdminPage(handle: {
  props: {
    identity: ReturnType<typeof operatorFrom>
    csrf: string
    signupOpen: boolean
    operators: { id: string; email: string; instanceAdmin: boolean }[]
    revealed?: RevealedTempPassword
  }
}) {
  return () => {
    let { identity, csrf, signupOpen, operators, revealed } = handle.props
    let readOnly = identity.inspecting != null

    return (
      <AppShell title="Admin" identity={identity} csrf={csrf} current="admin">
        <h1 mix={heading}>Admin</h1>
        <p mix={lead}>Sign-up is {signupOpen ? 'open' : 'closed'}.</p>
        {readOnly ? null : (
          <form method="post" action={routes.admin.signup.href()}>
            <input type="hidden" name="_csrf" value={csrf} />
            <input type="hidden" name="signup_open" value={signupOpen ? '0' : '1'} />
            <button type="submit" mix={ghostAction}>
              {signupOpen ? 'Close sign-up' : 'Open sign-up'}
            </button>
          </form>
        )}
        {revealed ? (
          <section mix={tagSection}>
            <p mix={lead}>
              Temporary password for {revealed.email}. Copy it now; it is shown once and never
              mailed.
            </p>
            <label mix={labelStyle}>
              Temporary password
              <input id="temp-password" type="text" readOnly value={revealed.password} />
            </label>
            <p>
              <button type="button" mix={ghostAction} id="copy-temp-password">
                Copy
              </button>
            </p>
            <script>
              {`(function(){var i=document.getElementById('temp-password');var b=document.getElementById('copy-temp-password');if(!i||!b)return;b.addEventListener('click',function(){i.focus();i.select();if(navigator.clipboard)navigator.clipboard.writeText(i.value);});})();`}
            </script>
          </section>
        ) : null}
        <section mix={tagSection}>
          <h2 mix={heading}>Operators</h2>
          <ul mix={inventoryList}>
            {operators.map((operator) => (
              <li key={operator.id} mix={inventoryItem}>
                <p>{operator.email}</p>
                {operator.id === identity.id ? (
                  <p mix={mutedNote}>Instance admin</p>
                ) : readOnly ? null : (
                  <div mix={fieldStack}>
                    <form
                      method="post"
                      action={routes.admin.inspect.href({ operatorId: operator.id })}
                    >
                      <input type="hidden" name="_csrf" value={csrf} />
                      <button type="submit" mix={ghostAction}>
                        Inspect
                      </button>
                    </form>
                    <form
                      method="post"
                      action={routes.admin.tempPassword.href({ operatorId: operator.id })}
                    >
                      <input type="hidden" name="_csrf" value={csrf} />
                      <button type="submit" mix={ghostAction}>
                        Set temporary password
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </AppShell>
    )
  }
}

import { css } from 'remix/ui'
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
import { LedgerCell, PageHeader, Receipt, SectionLabel, Stamp, Subheading } from '../../ui/components.tsx'
import {
  FONT_MONEY,
  ghostAction,
  labelStyle,
  ledgerHead,
  ledgerTable,
  ledgerTableRow,
  lead,
  leaveRow,
  mutedNote,
  quietAction,
  revealStagger,
  stackGap,
} from '../../ui/styles.ts'
import { mustGet } from '../../utils/context.ts'
import { generateTempPassword, hashPassword } from '../../utils/password.ts'

/* Shared column template so the head row and each operator row line up on
 * desktop: Operator takes the remaining space, Role and Actions are fixed. */
const operatorColumns = css({
  '@media (min-width: 48rem)': { gridTemplateColumns: 'minmax(0, 1fr) 10rem 20rem' },
})

/* An email is an identifier, not a headline: it reads better in the money mono
 * than in the wonky display face. */
const operatorName = css({
  fontFamily: FONT_MONEY,
  fontSize: '0.86rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
  color: 'var(--ink)',
  overflowWrap: 'anywhere',
  margin: 0,
})

const signupHeaderRow = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  flexWrap: 'wrap',
})

const tempPasswordValue = css({
  fontFamily: FONT_MONEY,
  fontSize: '1.1rem',
  letterSpacing: '0.02em',
})

const operatorActions = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  '& form': { display: 'contents' },
  '@media (min-width: 48rem)': { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
})

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
        <PageHeader title="Admin" />
        <div mix={stackGap}>
          <Receipt>
            <div mix={signupHeaderRow}>
              <Subheading>Sign-up</Subheading>
              <Stamp tone={signupOpen ? 'gold' : 'neutral'}>{signupOpen ? 'Open' : 'Closed'}</Stamp>
            </div>
            <p mix={lead}>Sign-up is {signupOpen ? 'open' : 'closed'}.</p>
            {readOnly ? null : (
              <form method="post" action={routes.admin.signup.href()} mix={leaveRow}>
                <input type="hidden" name="_csrf" value={csrf} />
                <input type="hidden" name="signup_open" value={signupOpen ? '0' : '1'} />
                <button type="submit" mix={ghostAction}>
                  {signupOpen ? 'Close sign-up' : 'Open sign-up'}
                </button>
              </form>
            )}
          </Receipt>
          {revealed ? (
            <Receipt sunk>
              <SectionLabel>One-time secret</SectionLabel>
              <Subheading>Temporary password for {revealed.email}</Subheading>
              <p mix={mutedNote}>Copy it now; it is shown once and never mailed.</p>
              <label mix={labelStyle}>
                Temporary password
                <input
                  id="temp-password"
                  type="text"
                  readOnly
                  value={revealed.password}
                  mix={tempPasswordValue}
                />
              </label>
              <p mix={leaveRow}>
                <button type="button" mix={ghostAction} id="copy-temp-password">
                  Copy
                </button>
              </p>
              <script>
                {`(function(){var i=document.getElementById('temp-password');var b=document.getElementById('copy-temp-password');if(!i||!b)return;b.addEventListener('click',function(){i.focus();i.select();if(navigator.clipboard)navigator.clipboard.writeText(i.value);});})();`}
              </script>
            </Receipt>
          ) : null}
          <section>
            <Subheading>Operators</Subheading>
            <ol mix={[ledgerTable, revealStagger]}>
              <li mix={[ledgerHead, operatorColumns]} aria-hidden="true">
                <span>Operator</span>
                <span>Role</span>
                <span>Actions</span>
              </li>
              {operators.map((operator) => {
                let isSelf = operator.id === identity.id
                return (
                  <li key={operator.id} mix={[ledgerTableRow, operatorColumns]}>
                    <LedgerCell label="Operator">
                      <span mix={operatorName}>{operator.email}</span>
                    </LedgerCell>
                    <LedgerCell label="Role">
                      {operator.instanceAdmin ? (
                        <Stamp tone="gold">Instance admin</Stamp>
                      ) : (
                        <span mix={mutedNote}>Operator</span>
                      )}
                    </LedgerCell>
                    <LedgerCell label={isSelf || readOnly ? '' : 'Actions'}>
                      {isSelf || readOnly ? null : (
                        <div mix={operatorActions}>
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
                            <button type="submit" mix={quietAction}>
                              Set temporary password
                            </button>
                          </form>
                        </div>
                      )}
                    </LedgerCell>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>
      </AppShell>
    )
  }
}

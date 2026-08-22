import { completeAuth, createCredentialsAuthProvider, verifyCredentials } from 'remix/auth'
import { getCsrfToken } from 'remix/middleware/csrf'
import { Auth } from 'remix/middleware/auth'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

import { countOperators, findOperatorByEmail } from '../../data/queries.ts'
import { sessionAuthRecord } from '../../middleware/auth.ts'
import { databaseContext } from '../../middleware/database.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import { errorBanner, fieldStack, heading, labelStyle, lead, primaryAction } from '../../ui/styles.ts'
import { mustGet } from '../../utils/context.ts'
import { verifyPassword } from '../../utils/password.ts'

let loginSchema = f.object({
  email: f.field(s.defaulted(s.string(), '')),
  password: f.field(s.defaulted(s.string(), '')),
})

export let passwordProvider = createCredentialsAuthProvider({
  parse(context) {
    return s.parse(loginSchema, context.get(FormData))
  },
  async verify({ email, password }, context) {
    let db = mustGet(context.get(databaseContext), 'database')
    let operator = await findOperatorByEmail(db, email)
    if (!operator || !(await verifyPassword(password, operator.password_hash))) {
      return null
    }
    return operator
  },
})

export default createController(routes.login, {
  actions: {
    async index(context) {
      let auth = context.get(Auth)
      if (auth?.ok) {
        return redirect(routes.home.href(), 303)
      }

      let operatorCount = await countOperators(mustGet(context.get(databaseContext), 'database'))
      if (operatorCount === 0) {
        return redirect(routes.oobe.index.href(), 303)
      }

      return context.render(<LoginPage csrf={getCsrfToken(context)} />)
    },

    async action(context) {
      let operatorCount = await countOperators(mustGet(context.get(databaseContext), 'database'))
      if (operatorCount === 0) {
        return redirect(routes.oobe.index.href(), 303)
      }

      let operator = await verifyCredentials(passwordProvider, context)
      if (operator == null) {
        return context.render(
          <LoginPage csrf={getCsrfToken(context)} error="Email or password is wrong." />,
          { status: 400 },
        )
      }

      let session = completeAuth(context)
      session.set('auth', sessionAuthRecord(operator))
      return redirect(routes.home.href(), 303)
    },
  },
})

function LoginPage(handle: { props: { csrf: string; error?: string } }) {
  return () => {
    let { csrf, error } = handle.props

    return (
      <AppShell title="Login">
        <h1 mix={heading}>Sign in</h1>
        <p mix={lead}>Email and password. Session lasts 30 days.</p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={routes.login.action.href()} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          <label mix={labelStyle}>
            Email
            <input type="email" name="email" required autoComplete="username" />
          </label>
          <label mix={labelStyle}>
            Password
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          <button type="submit" mix={primaryAction}>
            Login
          </button>
        </form>
      </AppShell>
    )
  }
}

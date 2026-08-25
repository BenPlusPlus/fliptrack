import { completeAuth, createCredentialsAuthProvider, verifyCredentials } from 'remix/auth'
import { getCsrfToken } from 'remix/middleware/csrf'
import { Auth } from 'remix/middleware/auth'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { email, minLength } from 'remix/data-schema/checks'

import {
  countOperators,
  createOperator,
  findOperatorByEmail,
  getSignupOpen,
} from '../../data/queries.ts'
import { sessionAuthRecord } from '../../middleware/auth.ts'
import { databaseContext } from '../../middleware/database.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import { errorBanner, fieldStack, heading, labelStyle, lead, primaryAction } from '../../ui/styles.ts'
import { mustGet } from '../../utils/context.ts'
import { hashPassword, verifyPassword } from '../../utils/password.ts'

let loginSchema = f.object({
  email: f.field(s.defaulted(s.string(), '')),
  password: f.field(s.defaulted(s.string(), '')),
})

let signupSchema = f.object({
  email: f.field(s.defaulted(s.string(), '').pipe(email())),
  password: f.field(s.defaulted(s.string(), '').pipe(minLength(8))),
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

      let db = mustGet(context.get(databaseContext), 'database')
      let operatorCount = await countOperators(db)
      if (operatorCount === 0) {
        return redirect(routes.oobe.index.href(), 303)
      }

      return context.render(
        <LoginPage csrf={getCsrfToken(context)} signupOpen={await getSignupOpen(db)} />,
      )
    },

    async action(context) {
      let db = mustGet(context.get(databaseContext), 'database')
      let operatorCount = await countOperators(db)
      if (operatorCount === 0) {
        return redirect(routes.oobe.index.href(), 303)
      }

      let operator = await verifyCredentials(passwordProvider, context)
      if (operator == null) {
        return context.render(
          <LoginPage
            csrf={getCsrfToken(context)}
            signupOpen={await getSignupOpen(db)}
            error="Email or password is wrong."
          />,
          { status: 400 },
        )
      }

      let session = completeAuth(context)
      session.set('auth', sessionAuthRecord(operator))
      if (operator.must_change_password) {
        return redirect(routes.password.index.href(), 303)
      }
      return redirect(routes.home.href(), 303)
    },

    async signup(context) {
      let db = mustGet(context.get(databaseContext), 'database')
      let operatorCount = await countOperators(db)
      if (operatorCount === 0) {
        return redirect(routes.oobe.index.href(), 303)
      }

      let csrf = getCsrfToken(context)
      if (!(await getSignupOpen(db))) {
        return context.render(
          <LoginPage csrf={csrf} signupOpen={false} error="Sign-up is closed." />,
          { status: 400 },
        )
      }

      let formData = context.get(FormData)
      let parsed = s.parseSafe(signupSchema, formData)
      if (!parsed.success) {
        return context.render(
          <LoginPage
            csrf={csrf}
            signupOpen
            error="Enter an email and a password of at least 8 characters."
            signupEmail={String(formData.get('email') ?? '')}
          />,
          { status: 400 },
        )
      }

      if (await findOperatorByEmail(db, parsed.value.email)) {
        return context.render(
          <LoginPage
            csrf={csrf}
            signupOpen
            error="That email is already an Operator."
            signupEmail={parsed.value.email}
          />,
          { status: 400 },
        )
      }

      let operator = await createOperator(db, {
        email: parsed.value.email,
        passwordHash: await hashPassword(parsed.value.password),
      })
      let session = completeAuth(context)
      session.set('auth', sessionAuthRecord(operator))
      return redirect(routes.home.href(), 303)
    },
  },
})

function LoginPage(handle: {
  props: { csrf: string; signupOpen?: boolean; error?: string; signupEmail?: string }
}) {
  return () => {
    let { csrf, signupOpen, error, signupEmail } = handle.props

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
        {signupOpen ? (
          <>
            <h2 mix={heading}>Create Operator</h2>
            <p mix={lead}>No setup secret. This starts empty Books.</p>
            <form method="post" action={routes.login.signup.href()} mix={fieldStack}>
              <input type="hidden" name="_csrf" value={csrf} />
              <label mix={labelStyle}>
                Email
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="username"
                  defaultValue={signupEmail}
                />
              </label>
              <label mix={labelStyle}>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" mix={primaryAction}>
                Create Operator
              </button>
            </form>
          </>
        ) : null}
      </AppShell>
    )
  }
}

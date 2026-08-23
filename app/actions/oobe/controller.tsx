import { completeAuth } from 'remix/auth'
import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { email, minLength } from 'remix/data-schema/checks'

import {
  countOperators,
  createInstanceAdmin,
  findInstanceAdmin,
  replaceInstanceAdminPassword,
} from '../../data/queries.ts'
import { appConfigContext } from '../../middleware/config.ts'
import { sessionAuthRecord } from '../../middleware/auth.ts'
import { databaseContext } from '../../middleware/database.ts'
import { routes } from '../../routes.ts'
import { errorBanner, fieldStack, heading, labelStyle, lead, primaryAction } from '../../ui/styles.ts'
import { AppShell } from '../../ui/shell.tsx'
import { mustGet } from '../../utils/context.ts'
import { hashPassword } from '../../utils/password.ts'

let firstRunSchema = f.object({
  setup_secret: f.field(s.defaulted(s.string(), '')),
  email: f.field(s.defaulted(s.string(), '').pipe(email())),
  password: f.field(s.defaulted(s.string(), '').pipe(minLength(8))),
})

let breakGlassSchema = f.object({
  setup_secret: f.field(s.defaulted(s.string(), '')),
  password: f.field(s.defaulted(s.string(), '').pipe(minLength(8))),
})

export default createController(routes.oobe, {
  actions: {
    async index(context) {
      let config = mustGet(context.get(appConfigContext), 'config')
      if (!config.setupSecret) {
        return redirect(routes.login.index.href(), 303)
      }

      let operatorCount = await countOperators(mustGet(context.get(databaseContext), 'database'))
      return context.render(
        <OobePage
          csrf={getCsrfToken(context)}
          mode={operatorCount === 0 ? 'first-run' : 'break-glass'}
        />,
      )
    },

    async action(context) {
      let config = mustGet(context.get(appConfigContext), 'config')
      if (!config.setupSecret) {
        return redirect(routes.login.index.href(), 303)
      }

      let db = mustGet(context.get(databaseContext), 'database')
      let operatorCount = await countOperators(db)
      let mode: 'first-run' | 'break-glass' = operatorCount === 0 ? 'first-run' : 'break-glass'
      let formData = context.get(FormData)
      let csrf = getCsrfToken(context)
      let submittedSecret = String(formData.get('setup_secret') ?? '')

      if (submittedSecret !== config.setupSecret) {
        return context.render(
          <OobePage csrf={csrf} mode={mode} error="That setup secret is wrong." />,
          { status: 400 },
        )
      }

      if (mode === 'first-run') {
        let parsed = s.parseSafe(firstRunSchema, formData)
        if (!parsed.success) {
          return context.render(
            <OobePage
              csrf={csrf}
              mode={mode}
              error="Enter an email and a password of at least 8 characters."
              email={String(formData.get('email') ?? '')}
            />,
            { status: 400 },
          )
        }

        let operator = await createInstanceAdmin(db, {
          email: parsed.value.email,
          passwordHash: await hashPassword(parsed.value.password),
        })
        let session = completeAuth(context)
        session.set('auth', sessionAuthRecord(operator))
        return redirect(routes.home.href(), 303)
      }

      let parsed = s.parseSafe(breakGlassSchema, formData)
      if (!parsed.success) {
        return context.render(
          <OobePage
            csrf={csrf}
            mode={mode}
            error="Enter a password of at least 8 characters."
          />,
          { status: 400 },
        )
      }

      let admin = await findInstanceAdmin(db)
      if (!admin) {
        return context.render(
          <OobePage csrf={csrf} mode={mode} error="No instance-admin Operator exists." />,
          { status: 400 },
        )
      }

      let operator = await replaceInstanceAdminPassword(
        db,
        admin.id,
        await hashPassword(parsed.value.password),
      )
      let session = completeAuth(context)
      session.set('auth', sessionAuthRecord(operator))
      return redirect(routes.home.href(), 303)
    },
  },
})

function OobePage(handle: {
  props: {
    csrf: string
    mode: 'first-run' | 'break-glass'
    error?: string
    email?: string
  }
}) {
  return () => {
    let { csrf, mode, error, email } = handle.props
    let firstRun = mode === 'first-run'

    return (
      <AppShell title={firstRun ? 'First run' : 'Break-glass'}>
        <h1 mix={heading}>
          {firstRun ? 'Create the instance-admin Operator' : 'Set a new standing password'}
        </h1>
        <p mix={lead}>
          {firstRun
            ? 'Gated by the setup secret. This creates empty Books.'
            : 'Gated by the setup secret. This does not create a second Operator.'}
        </p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={routes.oobe.action.href()} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          <label mix={labelStyle}>
            Setup secret
            <input type="password" name="setup_secret" required autoComplete="off" />
          </label>
          {firstRun ? (
            <label mix={labelStyle}>
              Email
              <input type="email" name="email" required autoComplete="username" defaultValue={email} />
            </label>
          ) : null}
          <label mix={labelStyle}>
            Password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete={firstRun ? 'new-password' : 'new-password'}
            />
          </label>
          <button type="submit" mix={primaryAction}>
            {firstRun ? 'Create Operator' : 'Set password'}
          </button>
        </form>
      </AppShell>
    )
  }
}

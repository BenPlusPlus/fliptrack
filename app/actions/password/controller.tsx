import { completeAuth } from 'remix/auth'
import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'
import { css } from 'remix/ui'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { minLength } from 'remix/data-schema/checks'
import { replaceOperatorPassword } from '../../data/queries.ts'
import { operatorFrom, requireOperator, sessionAuthRecord } from '../../middleware/auth.ts'
import { databaseContext } from '../../middleware/database.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import { PageHeader, Receipt } from '../../ui/components.tsx'
import { errorBanner, fieldStack, labelStyle, primaryAction } from '../../ui/styles.ts'
import { mustGet } from '../../utils/context.ts'
import { hashPassword } from '../../utils/password.ts'

let passwordSchema = f.object({
  password: f.field(s.defaulted(s.string(), '').pipe(minLength(8))),
})

export default createController(routes.password, {
  middleware: [requireOperator()],
  actions: {
    index(context) {
      let identity = operatorFrom(context)
      if (!identity.mustChangePassword) {
        return redirect(routes.account.href(), 303)
      }
      return context.render(
        <ForcedPasswordPage csrf={getCsrfToken(context)} identity={identity} />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      if (!identity.mustChangePassword) {
        return redirect(routes.account.href(), 303)
      }

      let parsed = s.parseSafe(passwordSchema, context.get(FormData))
      let csrf = getCsrfToken(context)
      if (!parsed.success) {
        return context.render(
          <ForcedPasswordPage
            csrf={csrf}
            identity={identity}
            error="Enter a password of at least 8 characters."
          />,
          { status: 400 },
        )
      }

      let operator = await replaceOperatorPassword(
        mustGet(context.get(databaseContext), 'database'),
        {
          operatorId: identity.id,
          passwordHash: await hashPassword(parsed.value.password),
          mustChangePassword: false,
        },
      )
      let session = completeAuth(context)
      session.set('auth', sessionAuthRecord(operator))
      return redirect(routes.home.href(), 303)
    },
  },
})

function ForcedPasswordPage(handle: {
  props: {
    csrf: string
    identity: ReturnType<typeof operatorFrom>
    error?: string
  }
}) {
  return () => {
    let { csrf, identity, error } = handle.props
    return (
      <AppShell title="Change password" identity={identity} csrf={csrf} hideNav>
        <div mix={interstitialCenter}>
          <div mix={interstitialNarrow}>
            <Receipt>
              <PageHeader
                title="Change your password"
                lead="The temporary password cannot be used after this."
              />
              {error ? <p mix={errorBanner}>{error}</p> : null}
              <form method="post" action={routes.password.action.href()} mix={fieldStack}>
                <input type="hidden" name="_csrf" value={csrf} />
                <label mix={labelStyle}>
                  New password
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>
                <button type="submit" mix={primaryAction}>
                  Save password
                </button>
              </form>
            </Receipt>
          </div>
        </div>
      </AppShell>
    )
  }
}

/* No sidebar on this interstitial (`hideNav`), so a single narrow Receipt is
 * centred by hand rather than reusing the two-column `authLayout`. */
const interstitialCenter = css({
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'center',
  minHeight: 'calc(100vh - 9rem)',
})

const interstitialNarrow = css({
  width: '100%',
  maxWidth: '26rem',
})

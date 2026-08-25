import { Auth, auth, createSessionAuthScheme, requireAuth } from 'remix/middleware/auth'
import { redirect } from 'remix/response/redirect'
import type { Middleware } from 'remix/router'
import { Session } from 'remix/session'

import { findOperatorById } from '../data/queries.ts'
import { routes } from '../routes.ts'
import { mustGet } from '../utils/context.ts'
import { databaseContext } from './database.ts'

export const INSPECT_SESSION_KEY = 'inspectOperatorId'
export const REVEALED_TEMP_PASSWORD_KEY = 'revealedTempPassword'

export type Inspecting = {
  operatorId: string
  email: string
}

export type OperatorIdentity = {
  id: string
  email: string
  booksId: string
  instanceAdmin: boolean
  mustChangePassword: boolean
  credentialsChangedAt: string
  inspecting?: Inspecting
}

type SessionAuth = {
  operatorId: string
  credentialsChangedAt: string
}

export function loadAuth() {
  return auth({
    schemes: [
      createSessionAuthScheme<OperatorIdentity, SessionAuth>({
        read(session) {
          let data = session.get('auth')
          if (data == null || typeof data !== 'object') {
            return null
          }
          return data as SessionAuth
        },
        async verify(value, context) {
          let db = mustGet(context.get(databaseContext), 'database')
          let operator = await findOperatorById(db, value.operatorId)
          if (!operator) {
            return null
          }
          let changedAt = credentialsChangedAtIso(operator.credentials_changed_at)
          if (changedAt !== value.credentialsChangedAt) {
            return null
          }
          return {
            id: operator.id,
            email: operator.email,
            booksId: operator.books_id,
            instanceAdmin: operator.instance_admin,
            mustChangePassword: operator.must_change_password,
            credentialsChangedAt: changedAt,
          }
        },
        invalidate(session) {
          session.unset('auth')
        },
      }),
    ],
  })
}

export function requireOperator() {
  return requireAuth<OperatorIdentity>({
    onFailure() {
      return redirect(routes.login.index.href(), 303)
    },
  })
}

export function operatorFrom(context: { get: (key: typeof Auth) => unknown }): OperatorIdentity {
  let auth = context.get(Auth) as { ok?: boolean; identity?: OperatorIdentity } | undefined
  if (!auth?.ok || !auth.identity) {
    throw new Error('requireOperator() should have redirected')
  }
  return auth.identity
}

export function requireInstanceAdmin(): Middleware {
  return (context, next) => {
    let identity = operatorFrom(context)
    if (!identity.instanceAdmin) {
      return new Response('Not Found', { status: 404 })
    }
    return next()
  }
}

export function loadInspect(): Middleware {
  return async (context, next) => {
    let auth = context.get(Auth) as { ok?: boolean; identity?: OperatorIdentity } | undefined
    if (!auth?.ok || !auth.identity?.instanceAdmin) {
      return next()
    }

    let session = mustGet(context.get(Session), 'session')
    let inspectId = session.get(INSPECT_SESSION_KEY)
    if (typeof inspectId !== 'string' || inspectId === '' || inspectId === auth.identity.id) {
      return next()
    }

    let db = mustGet(context.get(databaseContext), 'database')
    let target = await findOperatorById(db, inspectId)
    if (!target) {
      session.unset(INSPECT_SESSION_KEY)
      return next()
    }

    auth.identity.booksId = target.books_id
    auth.identity.inspecting = { operatorId: target.id, email: target.email }
    return next()
  }
}

export function refuseInspectorMutations(): Middleware {
  return (context, next) => {
    let auth = context.get(Auth) as { ok?: boolean; identity?: OperatorIdentity } | undefined
    if (!auth?.ok || !auth.identity?.inspecting) {
      return next()
    }

    let method = context.request.method.toUpperCase()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next()
    }

    let path = new URL(context.request.url).pathname
    if (path === routes.admin.leave.href() || path === routes.logout.href()) {
      return next()
    }

    return new Response('Inspector is read only.', { status: 403 })
  }
}

export function requireStandingPassword(): Middleware {
  return (context, next) => {
    let auth = context.get(Auth) as { ok?: boolean; identity?: OperatorIdentity } | undefined
    if (!auth?.ok || !auth.identity?.mustChangePassword) {
      return next()
    }

    let path = new URL(context.request.url).pathname
    if (
      path === routes.password.index.href() ||
      path === routes.password.action.href() ||
      path === routes.logout.href() ||
      path.startsWith('/assets/')
    ) {
      return next()
    }

    return redirect(routes.password.index.href(), 303)
  }
}

export function credentialsChangedAtIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}

export function sessionAuthRecord(identity: {
  id: string
  credentials_changed_at: unknown
}): SessionAuth {
  return {
    operatorId: identity.id,
    credentialsChangedAt: credentialsChangedAtIso(identity.credentials_changed_at),
  }
}

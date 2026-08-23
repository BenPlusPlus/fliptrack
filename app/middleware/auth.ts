import { Auth, auth, createSessionAuthScheme, requireAuth } from 'remix/middleware/auth'
import { redirect } from 'remix/response/redirect'

import { findOperatorById } from '../data/queries.ts'
import { routes } from '../routes.ts'
import { mustGet } from '../utils/context.ts'
import { databaseContext } from './database.ts'

export type OperatorIdentity = {
  id: string
  email: string
  booksId: string
  instanceAdmin: boolean
  credentialsChangedAt: string
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

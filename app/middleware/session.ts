import { createCookie } from 'remix/cookie'
import { createCookieSessionStorage } from 'remix/session-storage/cookie'
import type { SessionStorage } from 'remix/session'

const THIRTY_DAYS = 60 * 60 * 24 * 30

export function createSessionCookie(secret: string, secure: boolean) {
  return createCookie('fliptrack_session', {
    secrets: [secret],
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    maxAge: THIRTY_DAYS,
    path: '/',
  })
}

export function createAppSessionStorage(): SessionStorage {
  return createCookieSessionStorage()
}

export { THIRTY_DAYS }

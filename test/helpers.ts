import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { sql } from 'remix/data-table'

import { createApp, type CreateAppOptions } from '../app/router.ts'
import type { AppDatabase } from '../app/data/db.ts'
import { createAppDatabase } from '../app/data/db.ts'
import { routes } from '../app/routes.ts'

const INFO_PATH = path.resolve('tmp/test-postgres.json')

export const TEST_SETUP_SECRET = 'test-setup-secret'
export const TEST_SESSION_SECRET = 'test-session-secret'
export const TEST_EMAIL = 'operator@example.com'
export const TEST_PASSWORD = 'correct-horse-battery'

type PostgresInfo = {
  connectionString: string
}

export type TestApp = {
  router: ReturnType<typeof createApp>['router']
  db: AppDatabase
  jar: Map<string, string>
}

export async function readTestDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  let info = JSON.parse(await readFile(INFO_PATH, 'utf8')) as PostgresInfo
  return info.connectionString
}

export async function createTestApp(
  overrides: Partial<CreateAppOptions> = {},
): Promise<TestApp> {
  let databaseUrl = overrides.databaseUrl ?? (await readTestDatabaseUrl())
  let db = overrides.db ?? createAppDatabase(databaseUrl)
  let { router } = createApp({
    databaseUrl,
    sessionSecret: TEST_SESSION_SECRET,
    setupSecret: TEST_SETUP_SECRET,
    secureCookies: false,
    ...overrides,
    db,
  })
  return { router, db, jar: new Map() }
}

export async function resetBooks(db: AppDatabase): Promise<void> {
  await db.exec(sql`delete from sale_flip`)
  await db.exec(sql`delete from sale`)
  await db.exec(sql`delete from channel`)
  await db.exec(sql`delete from listing_flip`)
  await db.exec(sql`delete from listing`)
  await db.exec(sql`delete from flip_tag`)
  await db.exec(sql`delete from tag`)
  await db.exec(sql`delete from flip`)
  await db.exec(sql`delete from acquisition`)
  await db.exec(sql`delete from operator`)
  await db.exec(sql`delete from books`)
}

export async function fetchPage(
  app: TestApp,
  href: string,
  init: RequestInit = {},
): Promise<Response> {
  let headers = new Headers(init.headers)
  if (app.jar.size > 0) {
    headers.set('Cookie', cookieHeader(app.jar))
  }

  let response = await app.router.fetch(
    new Request(new URL(href, 'http://fliptrack.test'), {
      ...init,
      headers,
    }),
  )
  applySetCookie(app.jar, response)
  return response
}

export async function readBody(response: Response): Promise<string> {
  return response.text()
}

export function csrfToken(html: string): string {
  let match = html.match(/name="_csrf"\s+value="([^"]+)"/)
  if (!match) {
    throw new Error(`Expected a CSRF token in:\n${html.slice(0, 500)}`)
  }
  return match[1]!
}

export async function postForm(
  app: TestApp,
  href: string,
  fields: Record<string, string | string[]>,
): Promise<Response> {
  let page = await fetchPage(app, href)
  if (page.status >= 300 && page.status < 400) {
    return page
  }
  let html = await readBody(page)
  let form = new FormData()
  form.set('_csrf', csrfToken(html))
  appendFields(form, fields)
  return fetchPage(app, href, { method: 'POST', body: form })
}

export async function acquireFlip(
  app: TestApp,
  input: {
    name: string
    acquisitionDate?: string
    acquisitionNotes?: string
    taxPaid?: string
    inboundShipping?: string
    itemCost?: string
    notes?: string
    tag?: string
  },
): Promise<{ addHref: string; acquisitionId: string }> {
  let start = await postForm(app, routes.acquisitions.new.index.href(), {
    acquisition_date: input.acquisitionDate ?? '2026-08-22',
    notes: input.acquisitionNotes ?? '',
    tax_paid: input.taxPaid ?? '0',
    inbound_shipping: input.inboundShipping ?? '0',
  })
  let addHref = start.headers.get('Location')
  if (!addHref) {
    throw new Error('Expected redirect to Add Flip')
  }
  let acquisitionId = addHref.match(/\/acquisitions\/([^/]+)\//)?.[1]
  if (!acquisitionId) {
    throw new Error(`Could not parse Acquisition id from ${addHref}`)
  }
  let fields: Record<string, string> = {
    name: input.name,
    item_cost: input.itemCost ?? '10',
    notes: input.notes ?? '',
  }
  if (input.tag != null) {
    fields.tag = input.tag
  }
  let saved = await postForm(app, addHref, fields)
  if (saved.status >= 400) {
    throw new Error(`Add Flip failed (${saved.status}): ${await readBody(saved)}`)
  }
  return { addHref, acquisitionId }
}

export function flipHrefFromInventory(html: string, name: string): string {
  let escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`href="(/flips/[^"]+)"[^>]*>\\s*${escaped}`))
  if (!match) {
    throw new Error(`Expected a Flip hub link for "${name}" in:\n${html.slice(0, 1500)}`)
  }
  return match[1]!
}

export function listingHrefFromIndex(html: string, titlePart: string): string {
  let escaped = titlePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`href="(/listings/[a-f0-9-]+)"[^>]*>\\s*[^<]*${escaped}`))
  if (!match) {
    throw new Error(`Expected a Listing link for "${titlePart}" in:\n${html.slice(0, 1500)}`)
  }
  return match[1]!
}

export async function postFormFrom(
  app: TestApp,
  csrfFromHref: string,
  actionHref: string,
  fields: Record<string, string | string[]>,
): Promise<Response> {
  let page = await fetchPage(app, csrfFromHref)
  let html = await readBody(page)
  let form = new FormData()
  form.set('_csrf', csrfToken(html))
  appendFields(form, fields)
  return fetchPage(app, actionHref, { method: 'POST', body: form })
}

export async function createOperatorViaOobe(
  app: TestApp,
  input: { email?: string; password?: string; setupSecret?: string } = {},
): Promise<Response> {
  return postForm(app, routes.oobe.index.href(), {
    setup_secret: input.setupSecret ?? TEST_SETUP_SECRET,
    email: input.email ?? TEST_EMAIL,
    password: input.password ?? TEST_PASSWORD,
  })
}

export async function login(
  app: TestApp,
  input: { email?: string; password?: string } = {},
): Promise<Response> {
  return postForm(app, routes.login.index.href(), {
    email: input.email ?? TEST_EMAIL,
    password: input.password ?? TEST_PASSWORD,
  })
}

export async function fetchFollow(app: TestApp, href: string, init?: RequestInit): Promise<Response> {
  let response = await fetchPage(app, href, init)
  for (let hop = 0; hop < 6; hop += 1) {
    if (response.status < 300 || response.status >= 400) {
      return response
    }
    let location = response.headers.get('Location')
    if (!location) {
      return response
    }
    response = await fetchPage(app, location)
  }
  return response
}

export function setCookieMaxAge(response: Response): number | null {
  let headers =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : response.headers.get('set-cookie')
        ? [response.headers.get('set-cookie')!]
        : []
  for (let header of headers) {
    let match = header.match(/Max-Age=(\d+)/i)
    if (match) {
      return Number(match[1])
    }
  }
  return null
}

function applySetCookie(jar: Map<string, string>, response: Response) {
  let headers =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : response.headers.get('set-cookie')
        ? [response.headers.get('set-cookie')!]
        : []

  for (let header of headers) {
    let [pair] = header.split(';')
    if (!pair) continue
    let eq = pair.indexOf('=')
    if (eq === -1) continue
    let name = pair.slice(0, eq)
    let value = pair.slice(eq + 1)
    if (value === '' || /Max-Age=0/i.test(header) || /Expires=Thu, 01 Jan 1970/i.test(header)) {
      jar.delete(name)
    } else {
      jar.set(name, value)
    }
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

function appendFields(form: FormData, fields: Record<string, string | string[]>) {
  for (let [name, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (let item of value) {
        form.append(name, item)
      }
    } else {
      form.set(name, value)
    }
  }
}

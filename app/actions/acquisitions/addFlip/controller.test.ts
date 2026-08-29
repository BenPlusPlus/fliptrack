import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import {
  SECOND_EMAIL,
  adminActionHref,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  login,
  openSignup,
  postForm,
  postFormFrom,
  readBody,
  resetBooks,
  signupOperator,
} from '../../../../test/helpers.ts'

describe('Add a Flip', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('prints the Acquisition date and notes, without the old lead', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let started = await startAddFlip(app, {
        acquisitionDate: '2026-08-22',
        notes: 'Saturday haul',
      })
      let page = await fetchPage(app, started.addHref)
      assert.equal(page.status, 200)
      let html = await readBody(page)

      assert.match(html, /<h1[^>]*>Add a Flip<\/h1>/)
      assert.match(html, />2026-08-22</)
      assert.match(html, /Saturday haul/)
      assert.doesNotMatch(html, /Name and Item cost are required/)
      assert.doesNotMatch(html, /Stay until you leave/)
      assert.doesNotMatch(html, /<a[^>]*>[^<]*2026-08-22/)
      assert.doesNotMatch(html, /<a[^>]*>[^<]*Saturday haul/)
      assert.match(html, /name="name"[^>]*autofocus|autofocus[^>]*name="name"/)
      assert.match(
        html,
        hrefAttr(routes.acquisitions.show.href({ acquisitionId: started.acquisitionId })),
      )
    } finally {
      await app.db.close()
    }
  })

  it('prints the Acquisition date when notes are empty', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let started = await startAddFlip(app, { acquisitionDate: '2025-01-15', notes: '' })
      let html = await readBody(await fetchPage(app, started.addHref))
      assert.match(html, />2025-01-15</)
      assert.doesNotMatch(html, /Saturday haul/)
    } finally {
      await app.db.close()
    }
  })

  it('lets the inspector GET Add a Flip with Save omitted', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await openSignup(app)
      app.jar.clear()
      await signupOperator(app)
      let started = await startAddFlip(app, {
        acquisitionDate: '2026-03-01',
        notes: 'Guest haul',
      })

      app.jar.clear()
      await login(app)
      let admin = await readBody(await fetchPage(app, routes.admin.index.href()))
      let inspectHref = adminActionHref(admin, SECOND_EMAIL, 'inspect')
      await postFormFrom(app, routes.admin.index.href(), inspectHref, {})

      let page = await fetchPage(app, started.addHref)
      assert.equal(page.status, 200)
      let html = await readBody(page)
      assert.match(html, />2026-03-01</)
      assert.match(html, /Guest haul/)
      assert.match(html, /<h1[^>]*>Add a Flip<\/h1>/)
      assert.doesNotMatch(html, />Save Flip</)
      assert.match(html, /Viewing second@example.com — read only/)
    } finally {
      await app.db.close()
    }
  })
})

function hrefAttr(href: string): RegExp {
  let escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`href="${escaped}"`)
}

async function startAddFlip(
  app: Parameters<typeof postForm>[0],
  input: { acquisitionDate: string; notes: string },
): Promise<{ addHref: string; acquisitionId: string }> {
  let start = await postForm(app, routes.acquisitions.new.index.href(), {
    acquisition_date: input.acquisitionDate,
    notes: input.notes,
    tax_paid: '0',
    inbound_shipping: '0',
  })
  let addHref = start.headers.get('Location')
  if (!addHref) {
    throw new Error('Expected redirect to Add a Flip')
  }
  let match = addHref.match(/\/acquisitions\/([^/]+)\/flips\/new/)
  if (!match) {
    throw new Error(`Could not parse Acquisition id from ${addHref}`)
  }
  return { addHref, acquisitionId: match[1]! }
}

import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import {
  SECOND_EMAIL,
  adminActionHref,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
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

  it('lists the saved Flip on GET Add a Flip as newest, name and Item cost only', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let started = await startAddFlip(app, {
        acquisitionDate: '2026-08-22',
        notes: 'Saturday haul',
      })

      let land = await readBody(await fetchPage(app, started.addHref))
      assert.doesNotMatch(land, /This sitting/)

      let saved = await postForm(app, started.addHref, {
        name: 'Oak dresser',
        item_cost: '40',
        notes: '',
      })
      assert.equal(saved.status, 303)
      assert.equal(saved.headers.get('Location'), started.addHref)

      let html = await readBody(await fetchPage(app, started.addHref))
      assert.match(html, /This sitting/)
      assert.match(html, /Oak dresser/)
      assert.match(html, /\$40\.00/)
      assert.doesNotMatch(html, /<a[^>]*>Oak dresser/)
      assert.doesNotMatch(html, /href="\/flips\//)
      assert.doesNotMatch(html, />Remove</)
      assert.doesNotMatch(html, />Edit</)
      assert.doesNotMatch(html, /\d+ more/)
    } finally {
      await app.db.close()
    }
  })

  it('prepends further saves in the same sitting, newest first', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let started = await startAddFlip(app, {
        acquisitionDate: '2026-08-22',
        notes: '',
      })
      await postForm(app, started.addHref, { name: 'Lamp', item_cost: '10', notes: '' })
      await postForm(app, started.addHref, { name: 'Vase', item_cost: '8', notes: '' })
      await postForm(app, started.addHref, { name: 'Bowl', item_cost: '6', notes: '' })

      let html = await readBody(await fetchPage(app, started.addHref))
      let bowlAt = html.indexOf('Bowl')
      let vaseAt = html.indexOf('Vase')
      let lampAt = html.indexOf('Lamp')
      assert.ok(bowlAt >= 0 && vaseAt >= 0 && lampAt >= 0)
      assert.ok(bowlAt < vaseAt && vaseAt < lampAt)
      assert.match(html, /\$8\.00/)
      assert.match(html, /\$6\.00/)
      assert.doesNotMatch(html, /\d+ more/)
    } finally {
      await app.db.close()
    }
  })

  it('does not list a strip when the session has no matching sitting, and Save still creates', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let started = await startAddFlip(app, {
        acquisitionDate: '2026-08-22',
        notes: '',
      })
      app.jar.clear()
      await login(app)

      let empty = await readBody(await fetchPage(app, started.addHref))
      assert.doesNotMatch(empty, /This sitting/)

      let saved = await postForm(app, started.addHref, {
        name: 'Solo mug',
        item_cost: '5',
        notes: '',
      })
      assert.equal(saved.status, 303)

      let after = await readBody(await fetchPage(app, started.addHref))
      assert.doesNotMatch(after, /This sitting/)
      assert.doesNotMatch(after, /Solo mug/)

      let inventory = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventory, /Solo mug/)
      let flipHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventory, 'Solo mug')),
      )
      assert.match(flipHtml, /name="tax_paid"[^>]*value="0"|value="0"[^>]*name="tax_paid"/)
      assert.match(
        flipHtml,
        /name="inbound_shipping"[^>]*value="0"|value="0"[^>]*name="inbound_shipping"/,
      )
    } finally {
      await app.db.close()
    }
  })

  it('does not list Flips from an earlier sitting after Continue', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let first = await startAddFlip(app, {
        acquisitionDate: '2026-08-22',
        notes: 'Saturday haul',
      })
      await postForm(app, first.addHref, { name: 'Lamp', item_cost: '10', notes: '' })

      let continued = await postForm(
        app,
        routes.acquisitions.continue.index.href({ acquisitionId: first.acquisitionId }),
        {
          acquisition_date: '2026-08-22',
          notes: 'Saturday haul',
          tax_paid: '0',
          inbound_shipping: '0',
        },
      )
      assert.equal(continued.status, 303)
      let addHref = continued.headers.get('Location')
      assert.equal(addHref, first.addHref)

      let emptySitting = await readBody(await fetchPage(app, first.addHref))
      assert.doesNotMatch(emptySitting, /This sitting/)
      assert.doesNotMatch(emptySitting, /Lamp/)

      await postForm(app, first.addHref, { name: 'Vase', item_cost: '8', notes: '' })
      let html = await readBody(await fetchPage(app, first.addHref))
      assert.match(html, /This sitting/)
      assert.match(html, /Vase/)
      assert.doesNotMatch(html, /Lamp/)
    } finally {
      await app.db.close()
    }
  })

  it('caps the strip at 3 rows below 64rem and 5 from 64rem without a sitting total', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let started = await startAddFlip(app, {
        acquisitionDate: '2026-08-22',
        notes: '',
      })
      let names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']
      for (let name of names) {
        await postForm(app, started.addHref, { name, item_cost: '1', notes: '' })
      }

      let html = await readBody(await fetchPage(app, started.addHref))
      assert.match(html, /This sitting/)
      assert.match(html, /Foxtrot/)
      assert.match(html, /Echo/)
      assert.match(html, /Delta/)
      assert.match(html, /Charlie/)
      assert.match(html, /Bravo/)
      assert.doesNotMatch(html, /Alpha/)
      assert.match(html, /3 more/)
      assert.match(html, /1 more/)
      assert.ok(html.indexOf('Foxtrot') < html.indexOf('Echo'))
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

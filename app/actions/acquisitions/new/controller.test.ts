import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import {
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  postForm,
  readBody,
  resetBooks,
} from '../../../../test/helpers.ts'

describe('New Acquisition', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('adds one Flip and lists it on Inventory', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)

      let start = await postForm(app, routes.acquisitions.new.index.href(), {
        acquisition_date: '2026-08-22',
        notes: 'Saturday haul',
        tax_paid: '0',
        inbound_shipping: '0',
      })
      assert.equal(start.status, 303)
      let addHref = start.headers.get('Location')
      assert.ok(addHref)
      assert.match(addHref!, /\/acquisitions\/.+\/flips\/new/)

      let saved = await postForm(app, addHref!, {
        name: 'Oak dresser',
        item_cost: '40',
        notes: '',
      })
      assert.equal(saved.status, 303)
      assert.equal(saved.headers.get('Location'), addHref)

      let stillThere = await fetchPage(app, addHref!)
      assert.equal(stillThere.status, 200)
      let addHtml = await readBody(stillThere)
      assert.match(addHtml, /Add a Flip/)
      assert.doesNotMatch(addHtml, /Tag/)

      let inventory = await fetchPage(app, routes.inventory.href())
      assert.equal(inventory.status, 200)
      assert.match(await readBody(inventory), /Oak dresser/)
    } finally {
      await app.db.close()
    }
  })

  it('lists Flip names with newest Acquisition first', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)

      let older = await postForm(app, routes.acquisitions.new.index.href(), {
        acquisition_date: '2025-01-01',
        notes: '',
        tax_paid: '0',
        inbound_shipping: '0',
      })
      await postForm(app, older.headers.get('Location')!, {
        name: 'Older Flip',
        item_cost: '5',
        notes: '',
      })

      let newer = await postForm(app, routes.acquisitions.new.index.href(), {
        acquisition_date: '2026-08-22',
        notes: '',
        tax_paid: '0',
        inbound_shipping: '0',
      })
      await postForm(app, newer.headers.get('Location')!, {
        name: 'Newer Flip',
        item_cost: '8',
        notes: '',
      })

      let html = await readBody(await fetchPage(app, routes.inventory.href()))
      let newerAt = html.indexOf('Newer Flip')
      let olderAt = html.indexOf('Older Flip')
      assert.ok(newerAt >= 0 && olderAt >= 0)
      assert.ok(newerAt < olderAt)
    } finally {
      await app.db.close()
    }
  })

  it('records opening stock when Acquisition date is not today', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)

      let start = await postForm(app, routes.acquisitions.new.index.href(), {
        acquisition_date: '2024-01-15',
        notes: '',
        tax_paid: '1.50',
        inbound_shipping: '0',
      })
      let addHref = start.headers.get('Location')!
      await postForm(app, addHref, {
        name: 'Opening lamp',
        item_cost: '12',
        notes: 'from the closet',
      })

      let inventory = await fetchPage(app, routes.inventory.href())
      assert.match(await readBody(inventory), /Opening lamp/)
    } finally {
      await app.db.close()
    }
  })

  it('requires Item cost', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let start = await postForm(app, routes.acquisitions.new.index.href(), {
        acquisition_date: '2026-08-22',
        notes: '',
        tax_paid: '0',
        inbound_shipping: '0',
      })
      let addHref = start.headers.get('Location')!
      let refused = await postForm(app, addHref, {
        name: 'Nameless cost',
        item_cost: '',
        notes: '',
      })
      assert.equal(refused.status, 400)
      assert.match(await readBody(refused), /Item cost is required/)
    } finally {
      await app.db.close()
    }
  })

  it('refuses a negative Item cost', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let start = await postForm(app, routes.acquisitions.new.index.href(), {
        acquisition_date: '2026-08-22',
        notes: '',
        tax_paid: '0',
        inbound_shipping: '0',
      })
      let addHref = start.headers.get('Location')!
      let refused = await postForm(app, addHref, {
        name: 'Bad Flip',
        item_cost: '-1',
        notes: '',
      })
      assert.equal(refused.status, 400)
      assert.match(await readBody(refused), /Negatives are refused/)
    } finally {
      await app.db.close()
    }
  })
})

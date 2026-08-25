import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import {
  acquireFlip,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
  postForm,
  readBody,
  resetBooks,
} from '../../../../test/helpers.ts'

describe('late add to an Acquisition', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('snapshots this sitting onto new Flips only and leaves existing snapshots still', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let first = await acquireFlip(app, {
        acquisitionDate: '2026-08-22',
        acquisitionNotes: 'Saturday haul',
        taxPaid: '6',
        inboundShipping: '3',
        name: 'Lamp',
        itemCost: '10',
      })

      let continueHref = routes.acquisitions.continue.index.href({
        acquisitionId: first.acquisitionId,
      })
      let header = await fetchPage(app, continueHref)
      assert.equal(header.status, 200)
      let headerHtml = await readBody(header)
      assert.match(headerHtml, /value="2026-08-22"/)
      assert.match(headerHtml, /Saturday haul/)
      assert.match(headerHtml, /name="tax_paid"[^>]*value="0"|value="0"[^>]*name="tax_paid"/)
      assert.match(
        headerHtml,
        /name="inbound_shipping"[^>]*value="0"|value="0"[^>]*name="inbound_shipping"/,
      )

      let started = await postForm(app, continueHref, {
        acquisition_date: '2026-08-22',
        notes: 'Saturday haul',
        tax_paid: '4',
        inbound_shipping: '0',
      })
      assert.equal(started.status, 303)
      let addHref = started.headers.get('Location')
      assert.equal(
        addHref,
        routes.acquisitions.addFlip.index.href({ acquisitionId: first.acquisitionId }),
      )

      await postForm(app, addHref!, { name: 'Vase', item_cost: '10', notes: '' })
      await postForm(app, addHref!, { name: 'Bowl', item_cost: '10', notes: '' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventoryHtml, 'Lamp')),
      )
      assert.match(lampHtml, /value="10"/)
      assert.match(lampHtml, /value="6"/)
      assert.match(lampHtml, /value="3"/)

      let vaseHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventoryHtml, 'Vase')),
      )
      assert.match(vaseHtml, /value="2"/)

      let bowlHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventoryHtml, 'Bowl')),
      )
      assert.match(bowlHtml, /value="2"/)
    } finally {
      await app.db.close()
    }
  })

  it('does not auto-merge two Acquisitions on the same day', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let morning = await acquireFlip(app, {
        acquisitionDate: '2026-08-22',
        name: 'Morning mug',
        itemCost: '4',
      })
      let evening = await acquireFlip(app, {
        acquisitionDate: '2026-08-22',
        name: 'Evening lamp',
        itemCost: '12',
      })
      assert.notEqual(morning.acquisitionId, evening.acquisitionId)

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, /Morning mug/)
      assert.match(inventoryHtml, /Evening lamp/)
    } finally {
      await app.db.close()
    }
  })
})

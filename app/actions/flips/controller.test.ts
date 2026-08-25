import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import {
  acquireFlip,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
  postForm,
  postFormFrom,
  readBody,
  resetBooks,
} from '../../../test/helpers.ts'

describe('Flip hub', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('shows name, notes, inbound amounts, and Acquisition date/notes', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, {
        acquisitionDate: '2026-08-22',
        acquisitionNotes: 'Saturday haul',
        taxPaid: '1.50',
        inboundShipping: '3',
        name: 'Oak dresser',
        itemCost: '40',
        notes: 'from the barn',
      })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')

      let response = await fetchPage(app, hubHref)
      assert.equal(response.status, 200)
      let html = await readBody(response)
      assert.match(html, /Oak dresser/)
      assert.match(html, /from the barn/)
      assert.match(html, /2026-08-22/)
      assert.match(html, /Saturday haul/)
      assert.match(html, /Item cost/)
      assert.match(html, /Tax paid/)
      assert.match(html, /Inbound shipping/)
      assert.match(html, /name="item_cost"/)
      assert.match(html, /value="40"/)
      assert.match(html, /value="1.50"/)
      assert.match(html, /value="3"/)
    } finally {
      await app.db.close()
    }
  })

  it('replaces name, notes, and inbound amounts while the Flip is Inventory', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, {
        name: 'Oak dresser',
        itemCost: '40',
        notes: 'from the barn',
        taxPaid: '1.50',
        inboundShipping: '3',
      })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')

      let saved = await postForm(app, hubHref, {
        name: 'Walnut dresser',
        notes: 'refinished',
        item_cost: '45',
        tax_paid: '2',
        inbound_shipping: '4.25',
      })
      assert.equal(saved.status, 303)
      assert.equal(saved.headers.get('Location'), hubHref)

      let html = await readBody(await fetchPage(app, hubHref))
      assert.match(html, /Walnut dresser/)
      assert.match(html, /refinished/)
      assert.match(html, /value="45"/)
      assert.match(html, /value="2"/)
      assert.match(html, /value="4.25"/)
      assert.doesNotMatch(html, /Oak dresser/)
      assert.doesNotMatch(html, /from the barn/)
    } finally {
      await app.db.close()
    }
  })

  it('creates a Tag by naming and reuses the existing name case-insensitively', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '40' })
      await acquireFlip(app, { name: 'Pine stool', itemCost: '8' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dresserHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let stoolHref = flipHrefFromInventory(inventoryHtml, 'Pine stool')
      let dresserId = dresserHref.replace('/flips/', '')
      let stoolId = stoolHref.replace('/flips/', '')

      let created = await postFormFrom(app, dresserHref, routes.flips.addTag.href({ flipId: dresserId }), {
        tag: 'Shirts',
      })
      assert.equal(created.status, 303)
      assert.equal(created.headers.get('Location'), dresserHref)

      let dresserHtml = await readBody(await fetchPage(app, dresserHref))
      assert.match(dresserHtml, />Shirts</)

      let again = await postFormFrom(app, dresserHref, routes.flips.addTag.href({ flipId: dresserId }), {
        tag: 'shirts',
      })
      assert.equal(again.status, 303)
      dresserHtml = await readBody(await fetchPage(app, dresserHref))
      assert.equal(dresserHtml.match(/>Shirts</g)?.length, 1)
      assert.doesNotMatch(dresserHtml, />shirts</)

      let onStool = await postFormFrom(app, stoolHref, routes.flips.addTag.href({ flipId: stoolId }), {
        tag: 'SHIRTS',
      })
      assert.equal(onStool.status, 303)
      let stoolHtml = await readBody(await fetchPage(app, stoolHref))
      assert.match(stoolHtml, />Shirts</)
      assert.doesNotMatch(stoolHtml, />SHIRTS</)
    } finally {
      await app.db.close()
    }
  })

  it('removes an unused Flip and an emptied Acquisition', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let first = await acquireFlip(app, { name: 'Keep me', itemCost: '5' })
      await postForm(app, first.addHref, { name: 'Drop me', item_cost: '7', notes: '' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dropHref = flipHrefFromInventory(inventoryHtml, 'Drop me')
      let keepHref = flipHrefFromInventory(inventoryHtml, 'Keep me')

      let dropped = await postFormFrom(
        app,
        dropHref,
        routes.flips.remove.href({ flipId: dropHref.replace('/flips/', '') }),
        {},
      )
      assert.equal(dropped.status, 303)
      assert.equal(dropped.headers.get('Location'), routes.inventory.href())

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, /Keep me/)
      assert.doesNotMatch(inventoryHtml, /Drop me/)
      assert.equal((await fetchPage(app, dropHref)).status, 404)

      let last = await postFormFrom(
        app,
        keepHref,
        routes.flips.remove.href({ flipId: keepHref.replace('/flips/', '') }),
        {},
      )
      assert.equal(last.status, 303)
      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.doesNotMatch(inventoryHtml, /Keep me/)
      assert.equal(
        (
          await fetchPage(
            app,
            routes.acquisitions.continue.index.href({ acquisitionId: first.acquisitionId }),
          )
        ).status,
        404,
      )
    } finally {
      await app.db.close()
    }
  })
})

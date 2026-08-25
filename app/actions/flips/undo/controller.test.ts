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
  postFormFrom,
  readBody,
  resetBooks,
} from '../../../../test/helpers.ts'

describe('Undo and hitch', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('undoes a standing Sale from the Flip hub and snapshots hitch', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, {
        name: 'Oak dresser',
        itemCost: '10',
        taxPaid: '1.50',
        inboundShipping: '1.50',
      })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let flipId = hubHref.replace('/flips/', '')

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${flipId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '5',
        marketplace_fee: '3',
        outbound_shipping: '2',
        supplies: '1',
        sale_date: '2026-08-24',
        notes: 'paid on pickup',
      })
      assert.equal(sold.status, 303)
      let saleHref = sold.headers.get('Location')
      assert.ok(saleHref)

      let hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, /Profit/)
      assert.match(hubHtml, /\$6/)
      assert.match(hubHtml, />Undo</)
      let undoHref = routes.flips.undo.index.href({ flipId })
      assert.match(hubHtml, hrefAttr(undoHref))

      let confirm = await fetchPage(app, undoHref)
      assert.equal(confirm.status, 200)
      let confirmHtml = await readBody(confirm)
      assert.match(confirmHtml, /Marketplace fee/)
      assert.match(confirmHtml, /\$3/)
      assert.match(confirmHtml, /Outbound shipping/)
      assert.match(confirmHtml, /\$2/)
      assert.match(confirmHtml, /Supplies/)
      assert.match(confirmHtml, /\$1/)

      let undone = await postForm(app, undoHref, {})
      assert.equal(undone.status, 303)
      assert.equal(undone.headers.get('Location'), hubHref)

      hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.doesNotMatch(hubHtml, /Profit/)
      assert.match(hubHtml, /\$6\.00 will count on the next Sale or Write-off/)
      assert.match(hubHtml, /Undone Sale/)
      assert.match(hubHtml, hrefAttr(saleHref!))
      assert.doesNotMatch(hubHtml, />Undo</)
      assert.match(hubHtml, />Sold</)
      assert.doesNotMatch(hubHtml, /readOnly|readonly/)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, /Oak dresser/)
      let soldHtml = await readBody(await fetchPage(app, `${routes.inventory.href()}?segment=sold`))
      assert.doesNotMatch(soldHtml, /Oak dresser/)
    } finally {
      await app.db.close()
    }
  })

  it('undoes this Flip from the kit list without rewriting sibling shares', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Lamp', itemCost: '30' })
      await acquireFlip(app, { name: 'Cord', itemCost: '10' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampHref = flipHrefFromInventory(inventoryHtml, 'Lamp')
      let cordHref = flipHrefFromInventory(inventoryHtml, 'Cord')
      let lampId = lampHref.replace('/flips/', '')
      let cordId = cordHref.replace('/flips/', '')

      let created = await postForm(
        app,
        `${routes.sales.new.index.href()}?flip=${lampId}&flip=${cordId}`,
        {
          channel: 'Mercari',
          sale_price: '80',
          buyer_paid_shipping: '0',
          marketplace_fee: '4',
          outbound_shipping: '1',
          supplies: '0',
          sale_date: '2026-08-24',
          notes: '',
        },
      )
      assert.equal(created.status, 303)
      let saleHref = created.headers.get('Location')
      assert.ok(saleHref)

      let saleHtml = await readBody(await fetchPage(app, saleHref!))
      assert.match(saleHtml, /Lamp/)
      assert.match(saleHtml, /Cord/)
      let undoHref = routes.flips.undo.index.href({ flipId: lampId })
      assert.match(saleHtml, hrefAttr(undoHref))

      let confirm = await fetchPage(app, undoHref)
      assert.equal(confirm.status, 200)
      let confirmHtml = await readBody(confirm)
      assert.match(confirmHtml, /Marketplace fee/)
      assert.match(confirmHtml, /\$3/)
      assert.match(confirmHtml, /Outbound shipping/)
      assert.match(confirmHtml, /\$0\.75/)
      assert.match(confirmHtml, /Supplies/)
      assert.match(confirmHtml, /\$0/)

      let undone = await postForm(app, undoHref, {})
      assert.equal(undone.status, 303)
      assert.equal(undone.headers.get('Location'), lampHref)

      let lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /\$3\.75 will count on the next Sale or Write-off/)
      assert.match(lampHtml, /Undone Sale/)

      let cordHtml = await readBody(await fetchPage(app, cordHref))
      assert.match(cordHtml, /\$8\.75/)

      saleHtml = await readBody(await fetchPage(app, saleHref!))
      assert.doesNotMatch(saleHtml, /Lamp/)
      assert.match(saleHtml, /Cord/)
      assert.match(saleHtml, hrefAttr(routes.flips.undo.index.href({ flipId: cordId })))
    } finally {
      await app.db.close()
    }
  })

  it('does not rewrite hitch when the remaining deal is replaced in place', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Lamp', itemCost: '30' })
      await acquireFlip(app, { name: 'Cord', itemCost: '10' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampHref = flipHrefFromInventory(inventoryHtml, 'Lamp')
      let cordHref = flipHrefFromInventory(inventoryHtml, 'Cord')
      let lampId = lampHref.replace('/flips/', '')
      let cordId = cordHref.replace('/flips/', '')

      let created = await postForm(
        app,
        `${routes.sales.new.index.href()}?flip=${lampId}&flip=${cordId}`,
        {
          channel: 'eBay',
          sale_price: '80',
          buyer_paid_shipping: '0',
          marketplace_fee: '4',
          outbound_shipping: '1',
          supplies: '0',
          sale_date: '2026-08-01',
          notes: 'first pass',
        },
      )
      assert.equal(created.status, 303)
      let saleHref = created.headers.get('Location')!

      let undone = await postForm(app, routes.flips.undo.index.href({ flipId: lampId }), {})
      assert.equal(undone.status, 303)

      let replaced = await postForm(app, saleHref, {
        channel: 'eBay',
        sale_price: '40',
        buyer_paid_shipping: '0',
        marketplace_fee: '8',
        outbound_shipping: '4',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: 'remaining refund',
      })
      assert.equal(replaced.status, 303)

      let lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /\$3\.75 will count on the next Sale or Write-off/)
      assert.doesNotMatch(lampHtml, /Profit/)

      let cordHtml = await readBody(await fetchPage(app, cordHref))
      assert.match(cordHtml, /\$18/)
    } finally {
      await app.db.close()
    }
  })

  it('counts hitch on the next standing Sale or Write-off, including via a Retired ancestor', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10' })
      await acquireFlip(app, {
        name: 'Thrift bag',
        itemCost: '20',
        taxPaid: '0',
        inboundShipping: '0',
      })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dresserHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let bagHref = flipHrefFromInventory(inventoryHtml, 'Thrift bag')
      let dresserId = dresserHref.replace('/flips/', '')
      let bagId = bagHref.replace('/flips/', '')

      let firstSale = await postForm(app, `${routes.sales.new.index.href()}?flip=${dresserId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '3',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-10',
        notes: '',
      })
      assert.equal(firstSale.status, 303)
      assert.equal(
        (await postForm(app, routes.flips.undo.index.href({ flipId: dresserId }), {})).status,
        303,
      )

      let nextSale = await postForm(app, `${routes.sales.new.index.href()}?flip=${dresserId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(nextSale.status, 303)
      let dresserHtml = await readBody(await fetchPage(app, dresserHref))
      assert.match(dresserHtml, /Profit \$7/)
      assert.equal(
        (await postForm(app, routes.flips.undo.index.href({ flipId: dresserId }), {})).status,
        303,
      )

      let writtenOff = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${dresserId}`, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(writtenOff.status, 303)
      dresserHtml = await readBody(await fetchPage(app, dresserHref))
      assert.match(dresserHtml, /-\$13/)

      let bagSale = await postForm(app, `${routes.sales.new.index.href()}?flip=${bagId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '4',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-11',
        notes: '',
      })
      assert.equal(bagSale.status, 303)
      assert.equal((await postForm(app, routes.flips.undo.index.href({ flipId: bagId }), {})).status, 303)

      let bagHub = await readBody(await fetchPage(app, bagHref))
      assert.match(bagHub, />Re-split</)
      let resplit = await postFormFrom(
        app,
        routes.flips.resplit.index.href({ flipId: bagId }),
        routes.flips.resplit.action.href({ flipId: bagId }),
        {
          'child_name.0': 'Shirt',
          'child_item_cost.0': '12',
          'child_name.1': 'Mug',
          'child_item_cost.1': '8',
        },
      )
      assert.equal(resplit.status, 303)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let shirtHref = flipHrefFromInventory(inventoryHtml, 'Shirt')
      let mugHref = flipHrefFromInventory(inventoryHtml, 'Mug')
      let shirtId = shirtHref.replace('/flips/', '')

      let shirtHtml = await readBody(await fetchPage(app, shirtHref))
      assert.match(shirtHtml, /\$2\.40 will count on the next Sale or Write-off/)
      let mugHtml = await readBody(await fetchPage(app, mugHref))
      assert.match(mugHtml, /\$1\.60 will count on the next Sale or Write-off/)

      let shirtSale = await postForm(app, `${routes.sales.new.index.href()}?flip=${shirtId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(shirtSale.status, 303)
      shirtHtml = await readBody(await fetchPage(app, shirtHref))
      assert.match(shirtHtml, /\$5\.60/)
    } finally {
      await app.db.close()
    }
  })

  it('unfreezes Listing spend only when nothing still stands, and ended stays ended', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Lamp', itemCost: '30' })
      await acquireFlip(app, { name: 'Cord', itemCost: '10' })
      await acquireFlip(app, { name: 'Mug', itemCost: '4' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampHref = flipHrefFromInventory(inventoryHtml, 'Lamp')
      let cordHref = flipHrefFromInventory(inventoryHtml, 'Cord')
      let mugHref = flipHrefFromInventory(inventoryHtml, 'Mug')
      let lampId = lampHref.replace('/flips/', '')
      let cordId = cordHref.replace('/flips/', '')
      let mugId = mugHref.replace('/flips/', '')

      let kitListing = await postForm(app, listingNewHref([lampId, cordId]), {
        listing_spend: '8',
        notes: 'boost',
      })
      assert.equal(kitListing.status, 303)
      let kitListingHref = kitListing.headers.get('Location')!

      let soldLamp = await postForm(app, `${routes.sales.new.index.href()}?flip=${lampId}`, {
        channel: 'eBay',
        sale_price: '80',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(soldLamp.status, 303)

      let listingHtml = await readBody(await fetchPage(app, kitListingHref))
      assert.match(listingHtml, /readOnly|readonly/)
      assert.match(listingHtml, /\blive\b/)

      assert.equal(
        (await postForm(app, routes.flips.undo.index.href({ flipId: lampId }), {})).status,
        303,
      )
      listingHtml = await readBody(await fetchPage(app, kitListingHref))
      assert.match(listingHtml, /\blive\b/)
      assert.doesNotMatch(listingHtml, /readOnly|readonly/)

      let unfrozen = await postForm(app, kitListingHref, {
        listing_spend: '12',
        notes: 'boost',
      })
      assert.equal(unfrozen.status, 303)
      listingHtml = await readBody(await fetchPage(app, kitListingHref))
      assert.match(listingHtml, /value="12"/)

      let soldAgain = await postForm(app, `${routes.sales.new.index.href()}?flip=${lampId}`, {
        channel: 'eBay',
        sale_price: '80',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(soldAgain.status, 303)
      let soldCord = await postForm(app, `${routes.sales.new.index.href()}?flip=${cordId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(soldCord.status, 303)
      listingHtml = await readBody(await fetchPage(app, kitListingHref))
      assert.match(listingHtml, /readOnly|readonly/)
      assert.equal(
        (await postForm(app, routes.flips.undo.index.href({ flipId: lampId }), {})).status,
        303,
      )
      listingHtml = await readBody(await fetchPage(app, kitListingHref))
      assert.match(listingHtml, /readOnly|readonly/)

      let mugListing = await postForm(app, listingNewHref([mugId]), {
        listing_spend: '3',
        notes: 'window',
      })
      assert.equal(mugListing.status, 303)
      let mugListingHref = mugListing.headers.get('Location')!
      let soldMug = await postForm(app, `${routes.sales.new.index.href()}?flip=${mugId}`, {
        channel: 'eBay',
        sale_price: '6',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(soldMug.status, 303)
      let mugListingHtml = await readBody(await fetchPage(app, mugListingHref))
      assert.match(mugListingHtml, /\bended\b/)
      assert.match(mugListingHtml, /readOnly|readonly/)

      assert.equal((await postForm(app, routes.flips.undo.index.href({ flipId: mugId }), {})).status, 303)
      mugListingHtml = await readBody(await fetchPage(app, mugListingHref))
      assert.match(mugListingHtml, /\bended\b/)
      assert.doesNotMatch(mugListingHtml, /readOnly|readonly/)
      let spendReplaced = await postForm(app, mugListingHref, {
        listing_spend: '5',
        notes: 'window',
      })
      assert.equal(spendReplaced.status, 303)
      mugListingHtml = await readBody(await fetchPage(app, mugListingHref))
      assert.match(mugListingHtml, /\bended\b/)
      assert.match(mugListingHtml, /value="5"/)
    } finally {
      await app.db.close()
    }
  })

  it('keeps many Undone events and at most one standing Sale or Write-off', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let flipId = hubHref.replace('/flips/', '')

      let first = await postForm(app, `${routes.sales.new.index.href()}?flip=${flipId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '3',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-10',
        notes: '',
      })
      assert.equal(first.status, 303)
      let firstSaleHref = first.headers.get('Location')!
      assert.equal((await postForm(app, routes.flips.undo.index.href({ flipId }), {})).status, 303)

      let writtenOff = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${flipId}`, {
        outbound_shipping: '2',
        supplies: '1',
        write_off_date: '2026-08-12',
        notes: '',
      })
      assert.equal(writtenOff.status, 303)
      let writeOffHref = writtenOff.headers.get('Location')!

      let writeOffHtml = await readBody(await fetchPage(app, writeOffHref))
      assert.match(writeOffHtml, hrefAttr(routes.flips.undo.index.href({ flipId })))
      let confirm = await fetchPage(app, routes.flips.undo.index.href({ flipId }))
      assert.equal(confirm.status, 200)
      let confirmHtml = await readBody(confirm)
      assert.match(confirmHtml, /Marketplace fee/)
      assert.match(confirmHtml, /\$0/)
      assert.match(confirmHtml, /Outbound shipping/)
      assert.match(confirmHtml, /\$2/)
      assert.match(confirmHtml, /Supplies/)
      assert.match(confirmHtml, /\$1/)

      assert.equal((await postForm(app, routes.flips.undo.index.href({ flipId }), {})).status, 303)

      let hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, /Undone Sale/)
      assert.match(hubHtml, hrefAttr(firstSaleHref))
      assert.match(hubHtml, /Undone Write-off/)
      assert.match(hubHtml, hrefAttr(writeOffHref))
      assert.match(hubHtml, /\$6\.00 will count on the next Sale or Write-off/)
      assert.match(hubHtml, />Sold</)
      assert.match(hubHtml, />Write-off</)
      assert.doesNotMatch(hubHtml, />Remove</)

      let second = await postForm(app, `${routes.sales.new.index.href()}?flip=${flipId}`, {
        channel: 'Mercari',
        sale_price: '12',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(second.status, 303)
      hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, /Profit -\$4/)
      assert.match(hubHtml, /Undone Sale/)
      assert.match(hubHtml, /Undone Write-off/)
      assert.equal((await fetchPage(app, routes.flips.undo.index.href({ flipId }))).status, 200)

      let blockedWriteOff = await postFormFrom(app, hubHref, routes.writeOffs.new.action.href(), {
        flip: flipId,
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(blockedWriteOff.status, 400)
    } finally {
      await app.db.close()
    }
  })
})

function hrefAttr(href: string): RegExp {
  let escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`href="${escaped}"`)
}

function listingNewHref(flipIds: string[]): string {
  return `${routes.listings.new.index.href()}?${flipIds.map((id) => `flip=${id}`).join('&')}`
}

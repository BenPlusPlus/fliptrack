import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import {
  acquireFlip,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
  listingHrefFromIndex,
  postForm,
  postFormFrom,
  readBody,
  resetBooks,
} from '../../../test/helpers.ts'

describe('Listing', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('empty Listings index points at Inventory and the shell nav includes Listings', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)

      let homeHtml = await readBody(await fetchPage(app, routes.home.href()))
      assert.match(homeHtml, />Listings</)
      assert.match(homeHtml, />Home</)
      assert.match(homeHtml, />Inventory</)
      assert.match(homeHtml, />Account</)

      let index = await fetchPage(app, routes.listings.index.href())
      assert.equal(index.status, 200)
      let html = await readBody(index)
      assert.match(html, /Inventory/)
      assert.match(html, hrefAttr(routes.inventory.href()))
      assert.doesNotMatch(html, /href="\/listings\/[a-f0-9-]+"/)
    } finally {
      await app.db.close()
    }
  })

  it('creates from picked Inventory Flips, allows dual-listing, and lists live first', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Ash', itemCost: '10' })
      await acquireFlip(app, { name: 'Beech', itemCost: '10' })
      await acquireFlip(app, { name: 'Cedar', itemCost: '10' })
      await acquireFlip(app, { name: 'Dogwood', itemCost: '10' })
      await acquireFlip(app, { name: 'Oak', itemCost: '8' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, />Listing</)
      assert.match(inventoryHtml, /name="flip"/)
      let ashId = flipHrefFromInventory(inventoryHtml, 'Ash').replace('/flips/', '')
      let beechId = flipHrefFromInventory(inventoryHtml, 'Beech').replace('/flips/', '')
      let cedarId = flipHrefFromInventory(inventoryHtml, 'Cedar').replace('/flips/', '')
      let dogwoodId = flipHrefFromInventory(inventoryHtml, 'Dogwood').replace('/flips/', '')
      let oakId = flipHrefFromInventory(inventoryHtml, 'Oak').replace('/flips/', '')

      let empty = await fetchPage(app, routes.listings.new.index.href())
      assert.equal(empty.status, 400)
      assert.match(await readBody(empty), /Inventory Flips/)

      let formHref = listingNewHref([ashId, beechId, cedarId, dogwoodId])
      let formPage = await fetchPage(app, formHref)
      assert.equal(formPage.status, 200)
      let formHtml = await readBody(formPage)
      assert.match(formHtml, /Ash/)
      assert.match(formHtml, /Beech/)
      assert.match(formHtml, /Cedar/)
      assert.match(formHtml, /Dogwood/)
      assert.match(formHtml, /Listing spend/)
      assert.match(formHtml, /value="0"/)

      let created = await postForm(app, formHref, { listing_spend: '5', notes: 'front table' })
      assert.equal(created.status, 303)
      let listingHref = created.headers.get('Location')
      assert.ok(listingHref?.startsWith('/listings/'))
      assert.doesNotMatch(listingHref ?? '', /new/)

      let detailHtml = await readBody(await fetchPage(app, listingHref!))
      assert.match(detailHtml, /Ash/)
      assert.match(detailHtml, /Beech/)
      assert.match(detailHtml, /Cedar/)
      assert.match(detailHtml, /Dogwood/)
      assert.match(detailHtml, /front table/)
      assert.match(detailHtml, /value="5"/)
      assert.match(detailHtml, /\blive\b/)

      let oakListing = await postForm(app, listingNewHref([oakId]), {
        listing_spend: '0',
        notes: '',
      })
      assert.equal(oakListing.status, 303)
      let oakListingHref = oakListing.headers.get('Location')!

      let ended = await postForm(app, oakListingHref, { listing_spend: '0', notes: '' })
      assert.equal(ended.status, 303)
      let oakEnded = await postFormFrom(
        app,
        oakListingHref,
        routes.listings.end.href({ listingId: oakListingHref.replace('/listings/', '') }),
        {},
      )
      assert.equal(oakEnded.status, 303)

      let dual = await postForm(app, listingNewHref([oakId]), {
        listing_spend: '2',
        notes: 'second attempt',
      })
      assert.equal(dual.status, 303)

      let indexHtml = await readBody(await fetchPage(app, routes.listings.index.href()))
      assert.equal(
        listingHrefFromIndex(indexHtml, 'Ash, Beech, Cedar, and 1 more'),
        listingHref,
      )
      assert.match(indexHtml, /Ash, Beech, Cedar, and 1 more/)
      assert.match(indexHtml, /\$5\.00/)
      assert.match(indexHtml, /Oak/)
      assert.match(indexHtml, / · live/)
      assert.match(indexHtml, / · ended/)
      let firstLive = indexHtml.indexOf(' · live')
      let firstEnded = indexHtml.indexOf(' · ended')
      assert.ok(firstLive >= 0 && firstEnded >= 0 && firstLive < firstEnded)

      let oakHub = await readBody(
        await fetchPage(app, routes.flips.show.href({ flipId: oakId })),
      )
      assert.doesNotMatch(oakHub, />Remove</)
    } finally {
      await app.db.close()
    }
  })

  it('freezes Listing spend once a Flip on it has a standing Sale and subtracts it from Profit', async () => {
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

      let created = await postForm(app, listingNewHref([lampId, cordId]), {
        listing_spend: '8',
        notes: 'boost',
      })
      assert.equal(created.status, 303)
      let listingHref = created.headers.get('Location')!

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${lampId}`, {
        channel: 'eBay',
        sale_price: '80',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(sold.status, 303)

      let lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /\$44\.00/)

      let listingHtml = await readBody(await fetchPage(app, listingHref))
      assert.match(listingHtml, /readOnly|readonly/)
      assert.match(listingHtml, /value="8"/)
      assert.match(listingHtml, /Lamp/)
      assert.match(listingHtml, /Cord/)
      assert.match(listingHtml, /\blive\b/)

      let replaced = await postForm(app, listingHref, {
        listing_spend: '99',
        notes: 'still boosting',
      })
      assert.equal(replaced.status, 303)
      listingHtml = await readBody(await fetchPage(app, listingHref))
      assert.match(listingHtml, /still boosting/)
      assert.match(listingHtml, /value="8"/)
      assert.doesNotMatch(listingHtml, /value="99"/)

      lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /\$44\.00/)
    } finally {
      await app.db.close()
    }
  })

  it('Record Sale pre-selects remaining Inventory Flips and allows deselect plus Flips never on it', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Lamp', itemCost: '30' })
      await acquireFlip(app, { name: 'Cord', itemCost: '10' })
      await acquireFlip(app, { name: 'Bowl', itemCost: '5' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampId = flipHrefFromInventory(inventoryHtml, 'Lamp').replace('/flips/', '')
      let cordId = flipHrefFromInventory(inventoryHtml, 'Cord').replace('/flips/', '')
      let bowlId = flipHrefFromInventory(inventoryHtml, 'Bowl').replace('/flips/', '')

      let created = await postForm(app, listingNewHref([lampId, cordId]), {
        listing_spend: '0',
        notes: '',
      })
      assert.equal(created.status, 303)
      let listingHref = created.headers.get('Location')!
      let listingId = listingHref.replace('/listings/', '')

      let listingHtml = await readBody(await fetchPage(app, listingHref))
      assert.match(listingHtml, /Record Sale/)
      let recordHref = decodeHref(listingHtml.match(/href="(\/sales\/new\?[^"]+)"/)?.[1] ?? '')
      assert.ok(recordHref.startsWith('/sales/new?'))
      assert.match(recordHref, new RegExp(lampId))
      assert.match(recordHref, new RegExp(cordId))
      assert.doesNotMatch(recordHref, new RegExp(bowlId))

      let saleForm = await fetchPage(app, recordHref)
      assert.equal(saleForm.status, 200)
      let saleHtml = await readBody(saleForm)
      assert.equal(flipCheckboxChecked(saleHtml, lampId), true)
      assert.equal(flipCheckboxChecked(saleHtml, cordId), true)
      assert.equal(flipCheckboxChecked(saleHtml, bowlId), false)
      assert.match(saleHtml, /Bowl/)

      let saved = await postFormFrom(app, recordHref, routes.sales.new.action.href(), {
        flip: [lampId, bowlId],
        channel: 'eBay',
        sale_price: '40',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(saved.status, 303)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.doesNotMatch(inventoryHtml, /Lamp/)
      assert.match(inventoryHtml, /Cord/)
      assert.doesNotMatch(inventoryHtml, /Bowl/)

      listingHtml = await readBody(await fetchPage(app, listingHref))
      assert.match(listingHtml, /Lamp/)
      assert.match(listingHtml, /Cord/)
      assert.doesNotMatch(listingHtml, /Bowl/)
      assert.equal(listingHref, routes.listings.show.href({ listingId }))
    } finally {
      await app.db.close()
    }
  })

  it('End ends the Listing, ended stays ended, and sold-out ends without moving spend', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Lamp', itemCost: '10' })
      await acquireFlip(app, { name: 'Mug', itemCost: '4' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampId = flipHrefFromInventory(inventoryHtml, 'Lamp').replace('/flips/', '')
      let mugId = flipHrefFromInventory(inventoryHtml, 'Mug').replace('/flips/', '')

      let created = await postForm(app, listingNewHref([lampId]), {
        listing_spend: '3',
        notes: 'window',
      })
      assert.equal(created.status, 303)
      let listingHref = created.headers.get('Location')!
      let listingId = listingHref.replace('/listings/', '')

      let ended = await postFormFrom(
        app,
        listingHref,
        routes.listings.end.href({ listingId }),
        {},
      )
      assert.equal(ended.status, 303)
      assert.equal(ended.headers.get('Location'), listingHref)

      let listingHtml = await readBody(await fetchPage(app, listingHref))
      assert.match(listingHtml, /\bended\b/)
      assert.match(listingHtml, /value="3"/)
      assert.match(listingHtml, /window/)
      assert.doesNotMatch(listingHtml, />End</)

      let again = await postFormFrom(
        app,
        listingHref,
        routes.listings.end.href({ listingId }),
        {},
      )
      assert.equal(again.status, 303)
      listingHtml = await readBody(await fetchPage(app, listingHref))
      assert.match(listingHtml, /\bended\b/)
      assert.match(listingHtml, /value="3"/)

      let mugListing = await postForm(app, listingNewHref([mugId]), {
        listing_spend: '1',
        notes: '',
      })
      assert.equal(mugListing.status, 303)
      let mugListingHref = mugListing.headers.get('Location')!

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${mugId}`, {
        channel: 'eBay',
        sale_price: '6',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(sold.status, 303)

      let mugListingHtml = await readBody(await fetchPage(app, mugListingHref))
      assert.match(mugListingHtml, /\bended\b/)
      assert.match(mugListingHtml, /value="1"/)
    } finally {
      await app.db.close()
    }
  })

  it('a live Listing blocks Re-split until it is ended', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, {
        name: 'Thrift bag',
        itemCost: '20',
        taxPaid: '0',
        inboundShipping: '0',
      })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let parentHref = flipHrefFromInventory(inventoryHtml, 'Thrift bag')
      let parentId = parentHref.replace('/flips/', '')

      let created = await postForm(app, listingNewHref([parentId]), {
        listing_spend: '0',
        notes: '',
      })
      assert.equal(created.status, 303)
      let listingHref = created.headers.get('Location')!

      let hubHtml = await readBody(await fetchPage(app, parentHref))
      assert.doesNotMatch(hubHtml, />Re-split</)

      let blockedGet = await fetchPage(app, routes.flips.resplit.index.href({ flipId: parentId }))
      assert.equal(blockedGet.status, 404)

      let blocked = await postFormFrom(
        app,
        parentHref,
        routes.flips.resplit.action.href({ flipId: parentId }),
        {
          'child_name.0': 'Shirt',
          'child_item_cost.0': '12',
          'child_name.1': 'Mug',
          'child_item_cost.1': '8',
        },
      )
      assert.equal(blocked.status, 400)
      assert.match(await readBody(blocked), /live Listing/)

      let ended = await postFormFrom(
        app,
        listingHref,
        routes.listings.end.href({ listingId: listingHref.replace('/listings/', '') }),
        {},
      )
      assert.equal(ended.status, 303)

      hubHtml = await readBody(await fetchPage(app, parentHref))
      assert.match(hubHtml, />Re-split</)

      let saved = await postFormFrom(
        app,
        routes.flips.resplit.index.href({ flipId: parentId }),
        routes.flips.resplit.action.href({ flipId: parentId }),
        {
          'child_name.0': 'Shirt',
          'child_item_cost.0': '12',
          'child_name.1': 'Mug',
          'child_item_cost.1': '8',
        },
      )
      assert.equal(saved.status, 303)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, /Shirt/)
      assert.match(inventoryHtml, /Mug/)
    } finally {
      await app.db.close()
    }
  })

  it('a Flip on a Listing cannot be Removed while live or ended', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Keep me', itemCost: '5' })
      await acquireFlip(app, { name: 'Listed', itemCost: '7' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let keepHref = flipHrefFromInventory(inventoryHtml, 'Keep me')
      let listedHref = flipHrefFromInventory(inventoryHtml, 'Listed')
      let listedId = listedHref.replace('/flips/', '')

      let created = await postForm(app, listingNewHref([listedId]), {
        listing_spend: '0',
        notes: '',
      })
      assert.equal(created.status, 303)
      let listingHref = created.headers.get('Location')!

      let liveHub = await readBody(await fetchPage(app, listedHref))
      assert.doesNotMatch(liveHub, />Remove</)

      let liveRemove = await postFormFrom(
        app,
        listedHref,
        routes.flips.remove.href({ flipId: listedId }),
        {},
      )
      assert.equal(liveRemove.status, 400)
      assert.match(await readBody(liveRemove), /Listing/)

      let ended = await postFormFrom(
        app,
        listingHref,
        routes.listings.end.href({ listingId: listingHref.replace('/listings/', '') }),
        {},
      )
      assert.equal(ended.status, 303)

      let endedHub = await readBody(await fetchPage(app, listedHref))
      assert.doesNotMatch(endedHub, />Remove</)

      let endedRemove = await postFormFrom(
        app,
        listedHref,
        routes.flips.remove.href({ flipId: listedId }),
        {},
      )
      assert.equal(endedRemove.status, 400)
      assert.match(await readBody(endedRemove), /Listing/)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, /Listed/)

      let keepRemove = await postFormFrom(
        app,
        keepHref,
        routes.flips.remove.href({ flipId: keepHref.replace('/flips/', '') }),
        {},
      )
      assert.equal(keepRemove.status, 303)
    } finally {
      await app.db.close()
    }
  })
})

function listingNewHref(flipIds: string[]): string {
  return `${routes.listings.new.index.href()}?${flipIds.map((id) => `flip=${id}`).join('&')}`
}

function decodeHref(href: string): string {
  return href.replaceAll('&amp;', '&')
}

function hrefAttr(href: string): RegExp {
  let escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`href="${escaped}"`)
}

function flipCheckboxChecked(html: string, flipId: string): boolean {
  let tags = html.match(/<input\b[^>]*>/gi) ?? []
  let tag = tags.find(
    (input) => input.includes(`value="${flipId}"`) && /\bname="flip"/.test(input),
  )
  if (!tag) {
    throw new Error(`Expected a Flip checkbox for ${flipId} in:\n${html.slice(0, 1500)}`)
  }
  return /\bchecked\b/i.test(tag)
}

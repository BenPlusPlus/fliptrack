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

describe('Write-off', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('writes off picked Inventory Flips, shows $0-Proceeds Profit, and lists them as written-off', async () => {
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
      assert.match(inventoryHtml, /Write-off/)
      assert.match(inventoryHtml, /name="flip"/)

      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let flipId = hubHref.replace('/flips/', '')
      let hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, />Write-off</)

      let formHref = `${routes.writeOffs.new.index.href()}?flip=${flipId}`
      let formPage = await fetchPage(app, formHref)
      assert.equal(formPage.status, 200)
      let formHtml = await readBody(formPage)
      assert.match(formHtml, /Oak dresser/)
      assert.match(formHtml, /Acquisition cost/)
      assert.match(formHtml, /\$13/)
      assert.match(formHtml, /Write-off date/)
      assert.match(formHtml, /Outbound shipping/)
      assert.match(formHtml, /Supplies/)
      assert.doesNotMatch(formHtml, /Channel/)
      assert.doesNotMatch(formHtml, /Sale price/)
      assert.doesNotMatch(formHtml, /Buyer-paid shipping/)
      assert.doesNotMatch(formHtml, /Marketplace fee/)
      assert.doesNotMatch(formHtml, /fee preview|per-Flip|your share/i)

      let saved = await postForm(app, formHref, {
        outbound_shipping: '2',
        supplies: '1',
        write_off_date: '2026-08-24',
        notes: 'donated',
      })
      assert.equal(saved.status, 303)
      let writeOffHref = saved.headers.get('Location')
      assert.ok(writeOffHref?.startsWith('/write-offs/'))

      let writeOffHtml = await readBody(await fetchPage(app, writeOffHref!))
      assert.match(writeOffHtml, /donated/)
      assert.match(writeOffHtml, /value="2"/)
      assert.match(writeOffHtml, /Oak dresser/)

      hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, /Profit/)
      assert.match(hubHtml, /-\$16/)
      assert.match(hubHtml, hrefAttr(writeOffHref!))
      assert.doesNotMatch(hubHtml, />Remove</)
      assert.match(hubHtml, /readOnly|readonly/)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.doesNotMatch(inventoryHtml, /Oak dresser/)

      let writtenOffHtml = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?segment=written-off`),
      )
      assert.match(writtenOffHtml, /Written-off/)
      assert.match(writtenOffHtml, /Oak dresser/)
    } finally {
      await app.db.close()
    }
  })

  it('refuses negative Write-off money and allows $0', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10' })
      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let flipId = flipHrefFromInventory(inventoryHtml, 'Oak dresser').replace('/flips/', '')
      let formHref = `${routes.writeOffs.new.index.href()}?flip=${flipId}`

      let refused = await postForm(app, formHref, {
        outbound_shipping: '-1',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(refused.status, 400)
      assert.match(await readBody(refused), /Negatives are refused/)

      let zero = await postForm(app, formHref, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(zero.status, 303)

      let hubHtml = await readBody(
        await fetchPage(app, routes.flips.show.href({ flipId })),
      )
      assert.match(hubHtml, /-\$10/)
    } finally {
      await app.db.close()
    }
  })

  it('replaces Write-off date, typed money, and notes in place', async () => {
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
        `${routes.writeOffs.new.index.href()}?flip=${lampId}&flip=${cordId}`,
        {
          outbound_shipping: '4',
          supplies: '0',
          write_off_date: '2026-08-01',
          notes: 'first pass',
        },
      )
      assert.equal(created.status, 303)
      let writeOffHref = created.headers.get('Location')
      assert.ok(writeOffHref)

      let lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /-\$33\.00/)

      let cordHtml = await readBody(await fetchPage(app, cordHref))
      assert.match(cordHtml, /-\$11\.00/)

      let replaced = await postForm(app, writeOffHref!, {
        outbound_shipping: '8',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: 'hauler bill',
      })
      assert.equal(replaced.status, 303)
      assert.equal(replaced.headers.get('Location'), writeOffHref)

      let writeOffHtml = await readBody(await fetchPage(app, writeOffHref!))
      assert.match(writeOffHtml, /hauler bill/)
      assert.match(writeOffHtml, /value="8"/)
      assert.match(writeOffHtml, /value="2026-08-24"/)
      assert.doesNotMatch(writeOffHtml, /first pass/)

      lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /-\$36\.00/)

      cordHtml = await readBody(await fetchPage(app, cordHref))
      assert.match(cordHtml, /-\$12\.00/)
    } finally {
      await app.db.close()
    }
  })

  it('does not offer Write-off for a Flip on a live Listing and blocks until the Listing is ended', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let flipId = hubHref.replace('/flips/', '')

      let created = await postForm(app, listingNewHref([flipId]), {
        listing_spend: '0',
        notes: '',
      })
      assert.equal(created.status, 303)
      let listingHref = created.headers.get('Location')!

      let hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.doesNotMatch(hubHtml, />Write-off</)

      let formHref = `${routes.writeOffs.new.index.href()}?flip=${flipId}`
      let blockedGet = await fetchPage(app, formHref)
      assert.equal(blockedGet.status, 400)
      assert.match(await readBody(blockedGet), /live Listing/)

      let blockedPost = await postFormFrom(app, hubHref, routes.writeOffs.new.action.href(), {
        flip: flipId,
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(blockedPost.status, 400)
      assert.match(await readBody(blockedPost), /live Listing/)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, /Oak dresser/)

      let ended = await postFormFrom(
        app,
        listingHref,
        routes.listings.end.href({ listingId: listingHref.replace('/listings/', '') }),
        {},
      )
      assert.equal(ended.status, 303)

      hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, />Write-off</)

      let saved = await postForm(app, formHref, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(saved.status, 303)
    } finally {
      await app.db.close()
    }
  })

  it('freezes Listing spend once a Flip on it has a standing Write-off', async () => {
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
      let listingId = listingHref.replace('/listings/', '')

      let ended = await postFormFrom(
        app,
        listingHref,
        routes.listings.end.href({ listingId }),
        {},
      )
      assert.equal(ended.status, 303)

      let writtenOff = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${lampId}`, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(writtenOff.status, 303)

      let lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /-\$36\.00/)

      let listingHtml = await readBody(await fetchPage(app, listingHref))
      assert.match(listingHtml, /readOnly|readonly/)
      assert.match(listingHtml, /value="8"/)
      assert.match(listingHtml, /Lamp/)
      assert.match(listingHtml, /Cord/)

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
      assert.match(lampHtml, /-\$36\.00/)

      let cordHtml = await readBody(await fetchPage(app, cordHref))
      assert.doesNotMatch(cordHtml, /Profit/)
    } finally {
      await app.db.close()
    }
  })

  it('splits Tag slices into sold vs written-off counts in the selected window', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Shirt', itemCost: '10', tag: 'Shirts' })
      await acquireFlip(app, { name: 'Bowl', itemCost: '5' })
      await acquireFlip(app, { name: 'Keep', itemCost: '7', tag: 'Shirts' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let shirtId = flipHrefFromInventory(inventoryHtml, 'Shirt').replace('/flips/', '')
      let bowlId = flipHrefFromInventory(inventoryHtml, 'Bowl').replace('/flips/', '')

      let shirtOff = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${shirtId}`, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(shirtOff.status, 303)

      let bowlSale = await postForm(app, `${routes.sales.new.index.href()}?flip=${bowlId}`, {
        channel: 'eBay',
        sale_price: '8',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-10',
        notes: '',
      })
      assert.equal(bowlSale.status, 303)

      let monthHtml = await readBody(
        await fetchPage(app, `${routes.home.href()}?window=month&today=2026-08-24&weekStart=1`),
      )
      let shirtsBlock = sliceBlock(monthHtml, 'Shirts')
      assert.match(shirtsBlock, /Profit -\$10/)
      assert.match(shirtsBlock, /Sold 0/)
      assert.match(shirtsBlock, /Written-off 1/)
      assert.match(shirtsBlock, /Inventory \$7/)
      assert.match(shirtsBlock, /Unsold 1/)
      let untaggedBlock = sliceBlock(monthHtml, 'Untagged')
      assert.match(untaggedBlock, /Profit \$3/)
      assert.match(untaggedBlock, /Sold 1/)
      assert.match(untaggedBlock, /Written-off 0/)

      let weekHtml = await readBody(
        await fetchPage(app, `${routes.home.href()}?window=week&today=2026-08-24&weekStart=1`),
      )
      let weekShirts = sliceBlock(weekHtml, 'Shirts')
      assert.match(weekShirts, /Written-off 1/)
      let weekUntagged = sliceBlock(weekHtml, 'Untagged')
      assert.match(weekUntagged, /Sold 0/)
      assert.match(weekUntagged, /Written-off 0/)
    } finally {
      await app.db.close()
    }
  })

  it('freezes inbound amounts once the Write-off stands', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, {
        name: 'Oak dresser',
        itemCost: '10',
        taxPaid: '1',
        inboundShipping: '2',
      })
      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let flipId = hubHref.replace('/flips/', '')

      let writtenOff = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${flipId}`, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(writtenOff.status, 303)

      let hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, /readOnly|readonly/)

      let saved = await postForm(app, hubHref, {
        name: 'Oak dresser',
        notes: 'still the same Flip',
        item_cost: '99',
        tax_paid: '50',
        inbound_shipping: '50',
      })
      assert.equal(saved.status, 303)

      hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, /still the same Flip/)
      assert.match(hubHtml, /value="10"/)
      assert.match(hubHtml, /value="1"/)
      assert.match(hubHtml, /value="2"/)
      assert.doesNotMatch(hubHtml, /value="99"/)
    } finally {
      await app.db.close()
    }
  })

  it('refuses a standing Write-off on a Flip that already has a standing Sale, and the reverse', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Sold lamp', itemCost: '10' })
      await acquireFlip(app, { name: 'Written mug', itemCost: '4' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampHref = flipHrefFromInventory(inventoryHtml, 'Sold lamp')
      let mugHref = flipHrefFromInventory(inventoryHtml, 'Written mug')
      let lampId = lampHref.replace('/flips/', '')
      let mugId = mugHref.replace('/flips/', '')

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${lampId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(sold.status, 303)

      let writeOffSold = await postFormFrom(app, lampHref, routes.writeOffs.new.action.href(), {
        flip: lampId,
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(writeOffSold.status, 400)

      let writtenOff = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${mugId}`, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(writtenOff.status, 303)

      let sellWrittenOff = await postFormFrom(app, mugHref, routes.sales.new.action.href(), {
        flip: mugId,
        channel: 'eBay',
        sale_price: '6',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(sellWrittenOff.status, 400)
    } finally {
      await app.db.close()
    }
  })
})

function listingNewHref(flipIds: string[]): string {
  return `${routes.listings.new.index.href()}?${flipIds.map((id) => `flip=${id}`).join('&')}`
}

function hrefAttr(href: string): RegExp {
  let escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`href="${escaped}"`)
}

function sliceBlock(html: string, name: string): string {
  let escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`data-slice="${escaped}"[\\s\\S]*?</li>`))
  if (!match) {
    throw new Error(`Expected a Tag slice for "${name}" in:\n${html.slice(0, 2500)}`)
  }
  return match[0]
}

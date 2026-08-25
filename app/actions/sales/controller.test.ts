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

describe('Sale', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('sold from picked Inventory Flips opens one Sale form and records a one-Flip Sale', async () => {
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
      assert.match(inventoryHtml, /Sold/)
      assert.match(inventoryHtml, /name="flip"/)

      let hubHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let flipId = hubHref.replace('/flips/', '')
      let formHref = `${routes.sales.new.index.href()}?flip=${flipId}`

      let formPage = await fetchPage(app, formHref)
      assert.equal(formPage.status, 200)
      let formHtml = await readBody(formPage)
      assert.match(formHtml, /Oak dresser/)
      assert.match(formHtml, /Acquisition cost/)
      assert.match(formHtml, /\$13/)
      assert.match(formHtml, /Channel/)
      assert.match(formHtml, /Sale price/)
      assert.match(formHtml, /Buyer-paid shipping/)
      assert.match(formHtml, /Marketplace fee/)
      assert.match(formHtml, /Outbound shipping/)
      assert.match(formHtml, /Supplies/)
      assert.match(formHtml, /Sale date/)
      assert.doesNotMatch(formHtml, /fee preview|per-Flip|your share/i)

      let saved = await postForm(app, formHref, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '5',
        marketplace_fee: '3',
        outbound_shipping: '2',
        supplies: '1',
        sale_date: '2026-08-24',
        notes: 'paid on pickup',
      })
      assert.equal(saved.status, 303)
      let saleHref = saved.headers.get('Location')
      assert.ok(saleHref?.startsWith('/sales/'))

      let saleHtml = await readBody(await fetchPage(app, saleHref!))
      assert.match(saleHtml, /eBay/)
      assert.match(saleHtml, /paid on pickup/)
      assert.match(saleHtml, /value="20"/)

      let hubHtml = await readBody(await fetchPage(app, hubHref))
      assert.match(hubHtml, /Profit/)
      assert.match(hubHtml, /\$6/)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.doesNotMatch(inventoryHtml, /Oak dresser/)

      let soldHtml = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?segment=sold`),
      )
      assert.match(soldHtml, /Oak dresser/)
    } finally {
      await app.db.close()
    }
  })

  it('records a kit Sale split by Acquisition cost', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Lamp', itemCost: '30' })
      await acquireFlip(app, { name: 'Cord', itemCost: '10' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampId = flipHrefFromInventory(inventoryHtml, 'Lamp').replace('/flips/', '')
      let cordId = flipHrefFromInventory(inventoryHtml, 'Cord').replace('/flips/', '')
      let formHref = `${routes.sales.new.index.href()}?flip=${lampId}&flip=${cordId}`

      let formHtml = await readBody(await fetchPage(app, formHref))
      assert.match(formHtml, /Lamp/)
      assert.match(formHtml, /Cord/)
      assert.match(formHtml, /\$30/)
      assert.match(formHtml, /\$10/)
      assert.doesNotMatch(formHtml, /fee preview|per-Flip|your share/i)

      let saved = await postForm(app, formHref, {
        channel: 'Mercari',
        sale_price: '80',
        buyer_paid_shipping: '0',
        marketplace_fee: '4',
        outbound_shipping: '1',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(saved.status, 303)

      let lampHtml = await readBody(
        await fetchPage(app, routes.flips.show.href({ flipId: lampId })),
      )
      assert.match(lampHtml, /\$26\.25/)

      let cordHtml = await readBody(
        await fetchPage(app, routes.flips.show.href({ flipId: cordId })),
      )
      assert.match(cordHtml, /\$8\.75/)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.doesNotMatch(inventoryHtml, /Lamp/)
      assert.doesNotMatch(inventoryHtml, /Cord/)
    } finally {
      await app.db.close()
    }
  })

  it('creates a Channel by naming and reuses the existing name case-insensitively', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10' })
      await acquireFlip(app, { name: 'Pine stool', itemCost: '8' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dresserId = flipHrefFromInventory(inventoryHtml, 'Oak dresser').replace('/flips/', '')
      let stoolId = flipHrefFromInventory(inventoryHtml, 'Pine stool').replace('/flips/', '')

      let first = await postForm(app, `${routes.sales.new.index.href()}?flip=${dresserId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(first.status, 303)

      let second = await postForm(app, `${routes.sales.new.index.href()}?flip=${stoolId}`, {
        channel: 'ebay',
        sale_price: '12',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(second.status, 303)

      let accountHtml = await readBody(await fetchPage(app, routes.account.href()))
      assert.match(accountHtml, /eBay/)
      assert.equal(accountHtml.match(/>eBay</g)?.length, 1)
      assert.doesNotMatch(accountHtml, />ebay</)
    } finally {
      await app.db.close()
    }
  })

  it('refuses negative Sale money and allows $0', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10' })
      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let flipId = flipHrefFromInventory(inventoryHtml, 'Oak dresser').replace('/flips/', '')
      let formHref = `${routes.sales.new.index.href()}?flip=${flipId}`

      let refused = await postForm(app, formHref, {
        channel: 'eBay',
        sale_price: '-1',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(refused.status, 400)
      assert.match(await readBody(refused), /Negatives are refused/)

      let zero = await postForm(app, formHref, {
        channel: 'eBay',
        sale_price: '0',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
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

  it('freezes inbound amounts once the Sale stands', async () => {
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

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${flipId}`, {
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

  it('replaces Channel, Sale date, typed money, and notes in place', async () => {
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
      let saleHref = created.headers.get('Location')
      assert.ok(saleHref)

      let replaced = await postForm(app, saleHref!, {
        channel: 'Mercari',
        sale_price: '40',
        buyer_paid_shipping: '0',
        marketplace_fee: '4',
        outbound_shipping: '1',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: 'partial refund',
      })
      assert.equal(replaced.status, 303)
      assert.equal(replaced.headers.get('Location'), saleHref)

      let saleHtml = await readBody(await fetchPage(app, saleHref!))
      assert.match(saleHtml, /Mercari/)
      assert.match(saleHtml, /partial refund/)
      assert.match(saleHtml, /value="40"/)
      assert.match(saleHtml, /value="2026-08-24"/)
      assert.doesNotMatch(saleHtml, /first pass/)
      assert.doesNotMatch(saleHtml, />eBay</)

      let lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, /-\$3\.75/)

      let cordHtml = await readBody(await fetchPage(app, cordHref))
      assert.match(cordHtml, /-\$1\.25/)
    } finally {
      await app.db.close()
    }
  })
})

describe('Account Channels', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('lists Channels, rename keeps the Channel, and delete is refused while a Sale references it', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10' })
      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let flipId = flipHrefFromInventory(inventoryHtml, 'Oak dresser').replace('/flips/', '')

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${flipId}`, {
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
      let saleHref = sold.headers.get('Location')!

      let account = await fetchPage(app, routes.account.href())
      assert.equal(account.status, 200)
      let accountHtml = await readBody(account)
      assert.match(accountHtml, /Channels/)
      assert.match(accountHtml, /eBay/)
      let channelId = channelIdFromAccount(accountHtml, 'eBay')

      let renamed = await postFormFrom(
        app,
        routes.account.href(),
        routes.channels.rename.href({ channelId }),
        { name: 'Mercari' },
      )
      assert.equal(renamed.status, 303)
      assert.equal(renamed.headers.get('Location'), routes.account.href())

      accountHtml = await readBody(await fetchPage(app, routes.account.href()))
      assert.match(accountHtml, /Mercari/)
      assert.doesNotMatch(accountHtml, /eBay/)

      let saleHtml = await readBody(await fetchPage(app, saleHref))
      assert.match(saleHtml, /Mercari/)

      let deleted = await postForm(app, routes.channels.delete.index.href({ channelId }), {})
      assert.equal(deleted.status, 400)
      assert.match(await readBody(deleted), /Sale/)

      accountHtml = await readBody(await fetchPage(app, routes.account.href()))
      assert.match(accountHtml, /Mercari/)
    } finally {
      await app.db.close()
    }
  })
})

function channelIdFromAccount(html: string, name: string): string {
  let escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`/channels/([a-f0-9-]+)[^"]*"[^>]*>[\\s\\S]{0,200}?${escaped}`))
  if (!match) {
    match = html.match(new RegExp(`/channels/([a-f0-9-]+)`))
  }
  if (!match) {
    throw new Error(`Expected a Channel action for "${name}" in:\n${html.slice(0, 1500)}`)
  }
  return match[1]!
}

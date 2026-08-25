import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../routes.ts'
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
} from '../../test/helpers.ts'

describe('empty Home', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('shows $0 This Week / This Month / This Year Profit, $0 Inventory, and New Acquisition', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let response = await fetchPage(app, routes.home.href())
      assert.equal(response.status, 200)
      let html = await readBody(response)
      assert.match(html, /This Week/)
      assert.match(html, /This Month/)
      assert.match(html, /This Year/)
      assert.match(html, /Inventory/)
      assert.match(html, /Acquisition cost/)
      assert.match(html, /New Acquisition/)
      let zeros = html.match(/\$0/g) ?? []
      assert.ok(zeros.length >= 4)
    } finally {
      await app.db.close()
    }
  })
})

describe('Home P&L', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('shows This Week / This Month / This Year Profit and Tag slices for the selected window', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Shirt', itemCost: '10', tag: 'Shirts' })
      await acquireFlip(app, { name: 'Bowl', itemCost: '5' })
      await acquireFlip(app, { name: 'Keep', itemCost: '7', tag: 'Shirts' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let shirtId = flipHrefFromInventory(inventoryHtml, 'Shirt').replace('/flips/', '')
      let bowlId = flipHrefFromInventory(inventoryHtml, 'Bowl').replace('/flips/', '')

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

      let monthHref = `${routes.home.href()}?window=month&today=2026-08-24&weekStart=1`
      let monthPage = await fetchPage(app, monthHref)
      assert.equal(monthPage.status, 200)
      let monthHtml = await readBody(monthPage)
      assert.match(monthHtml, /This Week/)
      assert.match(monthHtml, /This Month/)
      assert.match(monthHtml, /This Year/)
      assert.match(monthHtml, /window=week/)
      assert.match(monthHtml, /window=year/)
      assert.doesNotMatch(monthHtml, /from–to|from-to|custom range/i)
      assert.match(monthHtml, /\$10/)
      assert.match(monthHtml, /\$13/)
      assert.match(monthHtml, /\$7/)

      assert.match(monthHtml, />Shirts</)
      assert.match(monthHtml, /Untagged/)
      let shirtsBlock = sliceBlock(monthHtml, 'Shirts')
      assert.match(shirtsBlock, /Profit \$10/)
      assert.match(shirtsBlock, /Sold 1/)
      assert.match(shirtsBlock, /Inventory \$7/)
      assert.match(shirtsBlock, /Unsold 1/)
      let untaggedBlock = sliceBlock(monthHtml, 'Untagged')
      assert.match(untaggedBlock, /Profit \$3/)
      assert.match(untaggedBlock, /Sold 1/)
      assert.doesNotMatch(shirtsBlock, /href=/)
      assert.doesNotMatch(untaggedBlock, /href=/)

      let weekHtml = await readBody(
        await fetchPage(app, `${routes.home.href()}?window=week&today=2026-08-24&weekStart=1`),
      )
      let weekShirts = sliceBlock(weekHtml, 'Shirts')
      assert.match(weekShirts, /Profit \$10/)
      assert.match(weekShirts, /Sold 1/)
      let weekUntagged = sliceBlock(weekHtml, 'Untagged')
      assert.match(weekUntagged, /Profit \$0/)
      assert.match(weekUntagged, /Sold 0/)
      assert.match(weekUntagged, /Unsold 0/)
    } finally {
      await app.db.close()
    }
  })
})

describe('Inventory filters', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('filters by name and by Tags-has-all; Untagged is exclusive', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '40', tag: 'Goodwill' })
      await acquireFlip(app, { name: 'Pine stool', itemCost: '8', tag: 'Shirts' })
      await acquireFlip(app, { name: 'Untagged bowl', itemCost: '3' })

      let inventory = await fetchPage(app, routes.inventory.href())
      let html = await readBody(inventory)
      let dresserHref = flipHrefFromInventory(html, 'Oak dresser')
      let stoolHref = flipHrefFromInventory(html, 'Pine stool')
      await postFormFrom(app, dresserHref, routes.flips.addTag.href({
        flipId: dresserHref.replace('/flips/', ''),
      }), { tag: 'Shirts' })

      html = await readBody(await fetchPage(app, `${routes.inventory.href()}?q=Oak`))
      assert.match(html, /Oak dresser/)
      assert.doesNotMatch(html, /Pine stool/)
      assert.doesNotMatch(html, /Untagged bowl/)

      html = await readBody(await fetchPage(app, routes.inventory.href()))
      let goodwillId = checkboxValue(html, 'Goodwill')
      let shirtsId = checkboxValue(html, 'Shirts')

      html = await readBody(
        await fetchPage(
          app,
          `${routes.inventory.href()}?tag=${encodeURIComponent(shirtsId)}&tag=${encodeURIComponent(goodwillId)}`,
        ),
      )
      assert.match(html, /Oak dresser/)
      assert.doesNotMatch(html, /Pine stool/)
      assert.doesNotMatch(html, /Untagged bowl/)

      html = await readBody(await fetchPage(app, `${routes.inventory.href()}?untagged=1`))
      assert.match(html, /Untagged bowl/)
      assert.doesNotMatch(html, /Oak dresser/)
      assert.doesNotMatch(html, /Pine stool/)

      html = await readBody(
        await fetchPage(
          app,
          `${routes.inventory.href()}?untagged=1&tag=${encodeURIComponent(shirtsId)}`,
        ),
      )
      assert.match(html, /Untagged bowl/)
      assert.doesNotMatch(html, /Oak dresser/)
      assert.doesNotMatch(html, /Pine stool/)
    } finally {
      await app.db.close()
    }
  })
})

function sliceBlock(html: string, name: string): string {
  let escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`data-slice="${escaped}"[\\s\\S]*?</li>`))
  if (!match) {
    throw new Error(`Expected a Tag slice for "${name}" in:\n${html.slice(0, 2500)}`)
  }
  return match[0]
}

function checkboxValue(html: string, label: string): string {
  let escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(
    new RegExp(`value="([^"]+)"[^>]*>\\s*${escaped}|${escaped}[\\s\\S]{0,80}?value="([^"]+)"`),
  )
  let value = match?.[1] ?? match?.[2]
  if (!value) {
    throw new Error(`Expected a Tag checkbox for "${label}" in:\n${html.slice(0, 1500)}`)
  }
  return value
}

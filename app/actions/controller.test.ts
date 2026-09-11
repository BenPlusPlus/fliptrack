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
      let proceedsCaptions = html.match(/on \$0 proceeds/g) ?? []
      assert.equal(proceedsCaptions.length, 3)
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

  it('captions each Profit stamp with same-window Proceeds', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Shirt', itemCost: '10' })
      await acquireFlip(app, { name: 'Bowl', itemCost: '5' })
      await acquireFlip(app, { name: 'Lamp', itemCost: '7' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let shirtId = flipHrefFromInventory(inventoryHtml, 'Shirt').replace('/flips/', '')
      let bowlId = flipHrefFromInventory(inventoryHtml, 'Bowl').replace('/flips/', '')
      let lampId = flipHrefFromInventory(inventoryHtml, 'Lamp').replace('/flips/', '')

      let shirtSale = await postForm(app, `${routes.sales.new.index.href()}?flip=${shirtId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '5',
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
        buyer_paid_shipping: '2',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-10',
        notes: '',
      })
      assert.equal(bowlSale.status, 303)

      let lampOff = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${lampId}`, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(lampOff.status, 303)

      let html = await readBody(
        await fetchPage(app, `${routes.home.href()}?window=month&today=2026-08-24&weekStart=1`),
      )
      let week = profitStampBlock(html, 'This Week')
      let month = profitStampBlock(html, 'This Month')
      let year = profitStampBlock(html, 'This Year')
      assert.match(week, /on \$25\.00 proceeds/)
      assert.match(month, /on \$35\.00 proceeds/)
      assert.match(year, /on \$35\.00 proceeds/)
      assert.doesNotMatch(week, /on \$35\.00 proceeds/)
      assert.doesNotMatch(html, /gross sales/i)
    } finally {
      await app.db.close()
    }
  })
})

describe('Home → Inventory', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('links the Inventory stamp to current Inventory', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let html = await readBody(await fetchPage(app, routes.home.href()))
      assert.match(html, /href="\/inventory"[\s\S]{0,900}?Acquisition cost/)
      assert.doesNotMatch(html, /href="\/inventory\?[^"]*"[\s\S]{0,900}?Acquisition cost/)
    } finally {
      await app.db.close()
    }
  })

  it('links Tag slice cards to that pile’s current Inventory, including Untagged and Unsold 0', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Shirt', itemCost: '10', tag: 'Shirts' })
      await acquireFlip(app, { name: 'Keep', itemCost: '7', tag: 'Shirts' })
      await acquireFlip(app, { name: 'Bowl', itemCost: '5' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let shirtsId = checkboxValue(inventoryHtml, 'Shirts')
      let shirtId = flipHrefFromInventory(inventoryHtml, 'Shirt').replace('/flips/', '')
      let keepId = flipHrefFromInventory(inventoryHtml, 'Keep').replace('/flips/', '')

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${shirtId}`, {
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

      let monthHref = `${routes.home.href()}?window=month&today=2026-08-24&weekStart=1`
      let html = await readBody(await fetchPage(app, monthHref))
      let shirtsBlock = sliceBlock(html, 'Shirts')
      assert.match(shirtsBlock, /aria-label="Shirts, Inventory"/)
      assert.match(shirtsBlock, hrefAttr(`${routes.inventory.href()}?tag=${shirtsId}`))
      assert.match(shirtsBlock, /Profit \$10/)
      assert.match(shirtsBlock, /Sold 1/)
      assert.match(shirtsBlock, /Unsold 1/)
      assert.doesNotMatch(shirtsBlock, /window=/)
      assert.doesNotMatch(shirtsBlock, /weekStart=/)

      let untaggedBlock = sliceBlock(html, 'Untagged')
      assert.match(untaggedBlock, /aria-label="Untagged, Inventory"/)
      assert.match(untaggedBlock, hrefAttr(`${routes.inventory.href()}?untagged=1`))
      assert.doesNotMatch(untaggedBlock, /window=/)
      assert.doesNotMatch(untaggedBlock, /weekStart=/)

      let keepSold = await postForm(app, `${routes.sales.new.index.href()}?flip=${keepId}`, {
        channel: 'eBay',
        sale_price: '12',
        buyer_paid_shipping: '0',
        marketplace_fee: '0',
        outbound_shipping: '0',
        supplies: '0',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(keepSold.status, 303)

      html = await readBody(await fetchPage(app, monthHref))
      shirtsBlock = sliceBlock(html, 'Shirts')
      assert.match(shirtsBlock, /Unsold 0/)
      assert.match(shirtsBlock, hrefAttr(`${routes.inventory.href()}?tag=${shirtsId}`))

      let empty = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?tag=${encodeURIComponent(shirtsId)}`),
      )
      assert.match(empty, /No Flips match\./)
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

describe('Inventory pick rows', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('shows name, Acquisition cost, days held, and Tag chips; Live and Tags sit outside the checkbox', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, {
        name: 'Oak dresser',
        itemCost: '40',
        tag: 'Goodwill',
        acquisitionDate: '2026-08-12',
      })
      await acquireFlip(app, {
        name: 'Today mug',
        itemCost: '3',
        acquisitionDate: '2026-08-24',
      })
      await acquireFlip(app, {
        name: 'Future lamp',
        itemCost: '5',
        acquisitionDate: '2026-08-25',
      })

      let html = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?today=2026-08-24`),
      )
      let dresser = pickRow(html, 'Oak dresser')
      assert.match(dresser, hrefAttr(flipHrefFromInventory(html, 'Oak dresser')))
      assert.match(dresser, /\$40\.00/)
      assert.match(dresser, />12d</)
      assert.match(dresser, /Goodwill/)
      assert.match(dresser, /name="flip"/)
      let dresserLabel = rowLabel(dresser)
      assert.match(dresserLabel, /Oak dresser/)
      assert.match(dresserLabel, /name="flip"/)
      assert.doesNotMatch(dresserLabel, /Goodwill/)
      assert.doesNotMatch(dresserLabel, />12d</)
      assert.doesNotMatch(dresser, /name="tag"/)
      assert.doesNotMatch(dresser, /href="\/inventory\?tag=/)

      assert.match(pickRow(html, 'Today mug'), />0d</)
      assert.match(pickRow(html, 'Future lamp'), />0d</)

      assert.match(html, /name="today"[\s\S]*?value="2026-08-24"|value="2026-08-24"[\s\S]*?name="today"/)
      assert.match(html, hrefAttr(`${routes.inventory.href()}?today=2026-08-24`))
      assert.match(html, hrefAttr(`${routes.inventory.href()}?segment=sold&today=2026-08-24`))
      assert.match(
        html,
        hrefAttr(`${routes.inventory.href()}?segment=written-off&today=2026-08-24`),
      )
    } finally {
      await app.db.close()
    }
  })

  it('shows Profit, ISO date, Channel, and Tags on Sold; Written-off omits Channel and Acquisition cost', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '10', taxPaid: '1.50', inboundShipping: '1.50', tag: 'Goodwill' })
      await acquireFlip(app, { name: 'Cracked bowl', itemCost: '10', taxPaid: '1.50', inboundShipping: '1.50', tag: 'Shirts' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dresserId = flipHrefFromInventory(inventoryHtml, 'Oak dresser').replace('/flips/', '')
      let bowlId = flipHrefFromInventory(inventoryHtml, 'Cracked bowl').replace('/flips/', '')

      let sold = await postForm(app, `${routes.sales.new.index.href()}?flip=${dresserId}`, {
        channel: 'eBay',
        sale_price: '20',
        buyer_paid_shipping: '5',
        marketplace_fee: '3',
        outbound_shipping: '2',
        supplies: '1',
        sale_date: '2026-08-24',
        notes: '',
      })
      assert.equal(sold.status, 303)

      let written = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${bowlId}`, {
        outbound_shipping: '2',
        supplies: '1',
        write_off_date: '2026-08-20',
        notes: '',
      })
      assert.equal(written.status, 303)

      let soldHtml = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?segment=sold&today=2026-08-24`),
      )
      let soldRow = pickRow(soldHtml, 'Oak dresser')
      assert.match(soldRow, /\$6\.00/)
      assert.match(soldRow, /2026-08-24/)
      assert.match(soldRow, /eBay/)
      assert.match(soldRow, /Goodwill/)
      assert.doesNotMatch(soldRow, /\$13\.00/)
      assert.doesNotMatch(soldRow, /12d|>0d</)
      assert.doesNotMatch(soldRow, /Live/)
      assert.doesNotMatch(soldRow, /name="flip"/)
      assert.doesNotMatch(soldRow, /href="\/listings\//)

      let writtenHtml = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?segment=written-off&today=2026-08-24`),
      )
      let writtenRow = pickRow(writtenHtml, 'Cracked bowl')
      assert.match(writtenRow, /-\$16\.00/)
      assert.match(writtenRow, /2026-08-20/)
      assert.match(writtenRow, /Shirts/)
      assert.doesNotMatch(writtenRow, /eBay/)
      assert.doesNotMatch(writtenRow, /Channel/)
      assert.doesNotMatch(writtenRow, /\$13\.00/)
      assert.doesNotMatch(writtenRow, /Live/)
    } finally {
      await app.db.close()
    }
  })

  it('omits Listing chrome when unlisted, shows kit title, and lists every live Listing when dual-listed', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Ash', itemCost: '10' })
      await acquireFlip(app, { name: 'Beech', itemCost: '10' })
      await acquireFlip(app, { name: 'Oak', itemCost: '8' })
      await acquireFlip(app, { name: 'Quiet mug', itemCost: '2' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let ashId = flipHrefFromInventory(inventoryHtml, 'Ash').replace('/flips/', '')
      let beechId = flipHrefFromInventory(inventoryHtml, 'Beech').replace('/flips/', '')
      let oakId = flipHrefFromInventory(inventoryHtml, 'Oak').replace('/flips/', '')

      let kit = await postForm(app, listingNewHref([ashId, beechId]), {
        listing_spend: '0',
        notes: '',
      })
      assert.equal(kit.status, 303)
      let kitHref = kit.headers.get('Location')!

      let first = await postForm(app, listingNewHref([oakId]), {
        listing_spend: '0',
        notes: 'first',
      })
      assert.equal(first.status, 303)
      let firstHref = first.headers.get('Location')!

      let second = await postForm(app, listingNewHref([oakId]), {
        listing_spend: '1',
        notes: 'second',
      })
      assert.equal(second.status, 303)
      let secondHref = second.headers.get('Location')!

      let html = await readBody(await fetchPage(app, routes.inventory.href()))
      let ashRow = pickRow(html, 'Ash')
      assert.match(ashRow, />Live</)
      assert.match(ashRow, hrefAttr(kitHref))
      assert.match(ashRow, /Ash, Beech/)
      let ashLabel = rowLabel(ashRow)
      assert.doesNotMatch(ashLabel, /Live/)
      assert.doesNotMatch(ashLabel, /Ash, Beech/)

      let oakRow = pickRow(html, 'Oak')
      assert.match(oakRow, hrefAttr(firstHref))
      assert.match(oakRow, hrefAttr(secondHref))
      assert.equal((oakRow.match(/>Live</g) ?? []).length, 2)

      let quiet = pickRow(html, 'Quiet mug')
      assert.doesNotMatch(quiet, /Live/)
      assert.doesNotMatch(quiet, /href="\/listings\//)
    } finally {
      await app.db.close()
    }
  })
})

function profitStampBlock(html: string, label: string): string {
  let escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`${escaped}[\\s\\S]{0,1200}?on \\$[0-9.]+ proceeds`))
  if (!match) {
    throw new Error(`Expected a Profit stamp for "${label}" in:\n${html.slice(0, 2500)}`)
  }
  return match[0]
}

function sliceBlock(html: string, name: string): string {
  let escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`data-slice="${escaped}"[\\s\\S]*?</li>`))
  if (!match) {
    throw new Error(`Expected a Tag slice for "${name}" in:\n${html.slice(0, 2500)}`)
  }
  return match[0]
}

function hrefAttr(href: string): RegExp {
  let htmlHref = href.replaceAll('&', '&amp;')
  let escaped = htmlHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`href="${escaped}"`)
}

function listingNewHref(flipIds: string[]): string {
  return `${routes.listings.new.index.href()}?${flipIds.map((id) => `flip=${id}`).join('&')}`
}

function pickRow(html: string, name: string): string {
  let escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`<li[^>]*data-name="${escaped}"[\\s\\S]*?</li>`))
  if (!match) {
    throw new Error(`Expected an Inventory row for "${name}" in:\n${html.slice(0, 2500)}`)
  }
  return match[0]
}

function rowLabel(row: string): string {
  let match = row.match(/<label[\s\S]*?<\/label>/)
  if (!match) {
    throw new Error(`Expected a checkbox label in:\n${row}`)
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

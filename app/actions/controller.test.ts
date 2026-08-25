import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../routes.ts'
import {
  acquireFlip,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
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

import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import {
  acquireFlip,
  copyJar,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
  openSignup,
  readBody,
  resetBooks,
  signupOperator,
} from '../../../test/helpers.ts'

describe('Acquisitions index', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('empty index points at New Acquisition and the shell nav includes Acquisitions', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)

      let homeHtml = await readBody(await fetchPage(app, routes.home.href()))
      assert.match(homeHtml, />Acquisitions</)
      assert.match(homeHtml, hrefAttr(routes.acquisitions.index.href()))

      let index = await fetchPage(app, routes.acquisitions.index.href())
      assert.equal(index.status, 200)
      let html = await readBody(index)
      assert.match(html, /No Acquisitions yet/)
      assert.match(html, hrefAttr(routes.acquisitions.new.index.href()))
      assert.doesNotMatch(html, /href="\/acquisitions\/[a-f0-9-]+"/)
    } finally {
      await app.db.close()
    }
  })

  it('lists newest Acquisition first and opens it so more Flips can be added', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let older = await acquireFlip(app, {
        acquisitionDate: '2025-01-01',
        name: 'Older Flip',
        itemCost: '5',
      })
      let newer = await acquireFlip(app, {
        acquisitionDate: '2026-08-22',
        acquisitionNotes: 'Saturday haul',
        name: 'Newer Flip',
        itemCost: '8',
      })
      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let newerFlipHref = flipHrefFromInventory(inventoryHtml, 'Newer Flip')

      let indexHtml = await readBody(await fetchPage(app, routes.acquisitions.index.href()))
      let newerHref = acquisitionHrefFromIndex(indexHtml, 'Newer Flip')
      let olderHref = acquisitionHrefFromIndex(indexHtml, 'Older Flip')
      assert.equal(newerHref, routes.acquisitions.show.href({ acquisitionId: newer.acquisitionId }))
      assert.equal(olderHref, routes.acquisitions.show.href({ acquisitionId: older.acquisitionId }))
      assert.ok(indexHtml.indexOf('Newer Flip') < indexHtml.indexOf('Older Flip'))
      assert.match(indexHtml, /2026-08-22/)
      assert.match(indexHtml, /Saturday haul/)

      let show = await fetchPage(app, newerHref)
      assert.equal(show.status, 200)
      let showHtml = await readBody(show)
      assert.match(showHtml, /Newer Flip/)
      assert.match(showHtml, /Saturday haul/)
      assert.match(showHtml, /2026-08-22/)
      assert.match(
        showHtml,
        hrefAttr(
          routes.acquisitions.continue.index.href({ acquisitionId: newer.acquisitionId }),
        ),
      )
      assert.match(showHtml, /Add Flips to this Acquisition/)
      assert.match(showHtml, hrefAttr(newerFlipHref))
      assert.match(showHtml, /Acquisition cost/)
      assert.match(showHtml, /Item cost/)
      assert.match(showHtml, /Tax paid/)
      assert.match(showHtml, /Inbound shipping/)
    } finally {
      await app.db.close()
    }
  })

  it('prints haul Acquisition cost from live Flip sums on the show page and index', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      let created = await acquireFlip(app, {
        name: 'Taxed lamp',
        itemCost: '10',
        taxPaid: '2',
        inboundShipping: '3',
      })

      let indexHtml = await readBody(await fetchPage(app, routes.acquisitions.index.href()))
      assert.match(indexHtml, /\$15\.00/)
      assert.doesNotMatch(indexHtml, /\$10\.00/)

      let showHtml = await readBody(
        await fetchPage(app, routes.acquisitions.show.href({ acquisitionId: created.acquisitionId })),
      )
      let acquisitionCostAt = showHtml.indexOf('Acquisition cost')
      let itemCostAt = showHtml.indexOf('Item cost')
      let taxPaidAt = showHtml.indexOf('Tax paid')
      let inboundAt = showHtml.indexOf('Inbound shipping')
      assert.ok(acquisitionCostAt >= 0)
      assert.ok(itemCostAt > acquisitionCostAt)
      assert.ok(taxPaidAt > itemCostAt)
      assert.ok(inboundAt > taxPaidAt)
      assert.match(showHtml, /\$15\.00/)
      assert.match(showHtml, /\$10\.00/)
      assert.match(showHtml, /\$2\.00/)
      assert.match(showHtml, /\$3\.00/)
      assert.match(showHtml, /Taxed lamp<\/a>[\s\S]{0,200}\$10\.00/)
      assert.doesNotMatch(showHtml, /Taxed lamp<\/a>[\s\S]{0,200}\$15\.00/)
    } finally {
      await app.db.close()
    }
  })

  it('keeps each Books to its own Acquisitions', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Admin lamp', itemCost: '12' })
      let firstJar = copyJar(app.jar)
      await openSignup(app)
      app.jar.clear()
      await signupOperator(app)
      await acquireFlip(app, { name: 'Guest vase', itemCost: '8' })

      let guestHtml = await readBody(await fetchPage(app, routes.acquisitions.index.href()))
      assert.match(guestHtml, /Guest vase/)
      assert.doesNotMatch(guestHtml, /Admin lamp/)

      let guestHref = acquisitionHrefFromIndex(guestHtml, 'Guest vase')
      app.jar = firstJar
      let foreign = await fetchPage(app, guestHref)
      assert.equal(foreign.status, 404)

      let adminHtml = await readBody(await fetchPage(app, routes.acquisitions.index.href()))
      assert.match(adminHtml, /Admin lamp/)
      assert.doesNotMatch(adminHtml, /Guest vase/)
    } finally {
      await app.db.close()
    }
  })
})

function hrefAttr(href: string): RegExp {
  let escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`href="${escaped}"`)
}

function acquisitionHrefFromIndex(html: string, titlePart: string): string {
  let escaped = titlePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`href="(/acquisitions/[a-f0-9-]+)"[^>]*>\\s*[^<]*${escaped}`))
  if (!match) {
    throw new Error(`Expected an Acquisition link for "${titlePart}" in:\n${html.slice(0, 1500)}`)
  }
  return match[1]!
}

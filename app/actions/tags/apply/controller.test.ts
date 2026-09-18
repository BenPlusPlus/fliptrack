import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import {
  SECOND_EMAIL,
  acquireFlip,
  adminActionHref,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
  login,
  openSignup,
  postForm,
  postFormFrom,
  readBody,
  resetBooks,
  signupOperator,
} from '../../../../test/helpers.ts'

describe('Inventory bulk Tag', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('empty pick copy is Pick Inventory Flips to tag.', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)

      let empty = await fetchPage(app, routes.tags.apply.index.href())
      assert.equal(empty.status, 400)
      assert.equal(await readBody(empty), 'Pick Inventory Flips to tag.')
    } finally {
      await app.db.close()
    }
  })

  it('opens a confirm stub of the picked names, one Tag field, Apply and Cancel', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '40', tag: 'Goodwill' })
      await acquireFlip(app, { name: 'Pine stool', itemCost: '8' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inventoryHtml, />Tag</)
      assert.match(inventoryHtml, /formaction="\/tags\/apply"/)
      assert.match(inventoryHtml, />Sold</)
      assert.match(inventoryHtml, />Write-off</)
      assert.match(inventoryHtml, />Listing</)

      let dresserId = flipHrefFromInventory(inventoryHtml, 'Oak dresser').replace('/flips/', '')
      let stoolId = flipHrefFromInventory(inventoryHtml, 'Pine stool').replace('/flips/', '')

      let formPage = await fetchPage(app, tagApplyHref([dresserId, stoolId]))
      assert.equal(formPage.status, 200)
      let formHtml = await readBody(formPage)
      assert.match(formHtml, /Oak dresser/)
      assert.match(formHtml, /Pine stool/)
      assert.match(formHtml, /list="tag-names"/)
      assert.match(formHtml, /value="Goodwill"/)
      assert.match(formHtml, />Apply</)
      assert.match(formHtml, />Cancel</)
      assert.doesNotMatch(formHtml, /name="flip"[^>]*type="checkbox"|type="checkbox"[^>]*name="flip"/)
    } finally {
      await app.db.close()
    }
  })

  it('Apply attaches the named Tag, creates it if needed, and already-has-it is a no-op', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '40', tag: 'Goodwill' })
      await acquireFlip(app, { name: 'Pine stool', itemCost: '8' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dresserHref = flipHrefFromInventory(inventoryHtml, 'Oak dresser')
      let stoolHref = flipHrefFromInventory(inventoryHtml, 'Pine stool')
      let dresserId = dresserHref.replace('/flips/', '')
      let stoolId = stoolHref.replace('/flips/', '')
      let formHref = tagApplyHref([dresserId, stoolId])

      let emptyName = await postForm(app, formHref, { name: '' })
      assert.equal(emptyName.status, 400)
      assert.match(await readBody(emptyName), /Tag name is required\./)

      let created = await postForm(app, formHref, { name: 'Shirts' })
      assert.equal(created.status, 303)
      assert.equal(created.headers.get('Location'), routes.inventory.href())

      let dresserHtml = await readBody(await fetchPage(app, dresserHref))
      assert.match(dresserHtml, />Shirts</)
      assert.match(dresserHtml, />Goodwill</)

      let stoolHtml = await readBody(await fetchPage(app, stoolHref))
      assert.match(stoolHtml, />Shirts</)
      assert.doesNotMatch(stoolHtml, />Goodwill</)

      let again = await postForm(app, formHref, { name: 'shirts' })
      assert.equal(again.status, 303)
      dresserHtml = await readBody(await fetchPage(app, dresserHref))
      assert.equal(dresserHtml.match(/>Shirts</g)?.length, 1)
      assert.doesNotMatch(dresserHtml, />shirts</)

      let existing = await postForm(app, formHref, { name: 'Goodwill' })
      assert.equal(existing.status, 303)
      dresserHtml = await readBody(await fetchPage(app, dresserHref))
      assert.equal(dresserHtml.match(/>Goodwill</g)?.length, 1)
      stoolHtml = await readBody(await fetchPage(app, stoolHref))
      assert.match(stoolHtml, />Goodwill</)
    } finally {
      await app.db.close()
    }
  })

  it('returns to the Inventory filter they were on; Untagged catch-up stays Untagged', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '40', tag: 'Goodwill' })
      await acquireFlip(app, { name: 'Untagged bowl', itemCost: '3' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dresserId = flipHrefFromInventory(inventoryHtml, 'Oak dresser').replace('/flips/', '')
      let bowlId = flipHrefFromInventory(inventoryHtml, 'Untagged bowl').replace('/flips/', '')
      let goodwillId = checkboxValue(inventoryHtml, 'Goodwill')

      let nameHref = tagApplyHref([dresserId], 'q=Oak')
      let nameForm = await fetchPage(app, nameHref)
      assert.equal(nameForm.status, 200)
      let nameHtml = await readBody(nameForm)
      assert.match(nameHtml, hrefAttr(`${routes.inventory.href()}?q=Oak`))

      let named = await postForm(app, nameHref, { name: 'Shirts' })
      assert.equal(named.status, 303)
      assert.equal(named.headers.get('Location'), `${routes.inventory.href()}?q=Oak`)
      assert.doesNotMatch(named.headers.get('Location') ?? '', /tag=/)

      let tagHref = tagApplyHref([dresserId], `tag=${goodwillId}`)
      let tagged = await postForm(app, tagHref, { name: 'Shirts' })
      assert.equal(tagged.status, 303)
      assert.equal(tagged.headers.get('Location'), `${routes.inventory.href()}?tag=${goodwillId}`)
      assert.doesNotMatch(tagged.headers.get('Location') ?? '', /Shirts/)

      let untaggedInventory = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?untagged=1`),
      )
      assert.match(untaggedInventory, /formaction="\/tags\/apply"/)
      assert.match(untaggedInventory, /type="hidden"[^>]*name="untagged"[^>]*value="1"|name="untagged"[^>]*value="1"[^>]*type="hidden"/)

      let namedInventory = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?q=Oak`),
      )
      assert.match(namedInventory, /type="hidden"[^>]*name="q"[^>]*value="Oak"|name="q"[^>]*value="Oak"[^>]*type="hidden"/)

      let taggedInventory = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?tag=${encodeURIComponent(goodwillId)}`),
      )
      assert.match(
        taggedInventory,
        new RegExp(
          `type="hidden"[^>]*name="tag"[^>]*value="${goodwillId}"|name="tag"[^>]*value="${goodwillId}"[^>]*type="hidden"`,
        ),
      )

      let untaggedHref = tagApplyHref([bowlId], 'untagged=1')
      let untaggedFormHtml = await readBody(await fetchPage(app, untaggedHref))
      assert.match(untaggedFormHtml, hrefAttr(`${routes.inventory.href()}?untagged=1`))

      let applied = await postForm(app, untaggedHref, { name: 'Shirts' })
      assert.equal(applied.status, 303)
      assert.equal(applied.headers.get('Location'), `${routes.inventory.href()}?untagged=1`)

      let untaggedList = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?untagged=1`),
      )
      assert.doesNotMatch(untaggedList, /Untagged bowl/)
      assert.doesNotMatch(untaggedList, /Oak dresser/)
    } finally {
      await app.db.close()
    }
  })

  it('refuses retired or realized Flips; Sold, Written-off, and inspecting have no Tag button', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Sold lamp', itemCost: '10' })
      await acquireFlip(app, { name: 'Written mug', itemCost: '4' })
      await acquireFlip(app, {
        name: 'Thrift bag',
        itemCost: '20',
        taxPaid: '0',
        inboundShipping: '0',
      })
      await acquireFlip(app, { name: 'Keep me', itemCost: '5' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let lampHref = flipHrefFromInventory(inventoryHtml, 'Sold lamp')
      let mugHref = flipHrefFromInventory(inventoryHtml, 'Written mug')
      let bagHref = flipHrefFromInventory(inventoryHtml, 'Thrift bag')
      let lampId = lampHref.replace('/flips/', '')
      let mugId = mugHref.replace('/flips/', '')
      let bagId = bagHref.replace('/flips/', '')

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

      let written = await postForm(app, `${routes.writeOffs.new.index.href()}?flip=${mugId}`, {
        outbound_shipping: '0',
        supplies: '0',
        write_off_date: '2026-08-24',
        notes: '',
      })
      assert.equal(written.status, 303)

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

      let soldGet = await fetchPage(app, tagApplyHref([lampId]))
      assert.equal(soldGet.status, 400)
      assert.match(await readBody(soldGet), /Inventory Flips/)

      let soldPost = await postFormFrom(app, lampHref, routes.tags.apply.action.href(), {
        flip: lampId,
        name: 'Shirts',
      })
      assert.equal(soldPost.status, 400)

      let writtenGet = await fetchPage(app, tagApplyHref([mugId]))
      assert.equal(writtenGet.status, 400)

      let retiredGet = await fetchPage(app, tagApplyHref([bagId]))
      assert.equal(retiredGet.status, 400)

      let missing = await fetchPage(app, tagApplyHref(['00000000-0000-4000-8000-000000000000']))
      assert.equal(missing.status, 404)

      let hubTag = await postFormFrom(app, lampHref, routes.flips.addTag.href({ flipId: lampId }), {
        tag: 'Shirts',
      })
      assert.equal(hubTag.status, 303)
      let lampHtml = await readBody(await fetchPage(app, lampHref))
      assert.match(lampHtml, />Shirts</)

      let soldHtml = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?segment=sold`),
      )
      assert.doesNotMatch(soldHtml, />Tag</)
      assert.doesNotMatch(soldHtml, /name="flip"/)
      assert.doesNotMatch(soldHtml, /formaction="\/tags\/apply"/)

      let writtenHtml = await readBody(
        await fetchPage(app, `${routes.inventory.href()}?segment=written-off`),
      )
      assert.doesNotMatch(writtenHtml, />Tag</)
      assert.doesNotMatch(writtenHtml, /name="flip"/)

      await openSignup(app)
      app.jar.clear()
      await signupOperator(app)
      await acquireFlip(app, { name: 'Guest vase', itemCost: '8' })

      app.jar.clear()
      await login(app)
      let admin = await readBody(await fetchPage(app, routes.admin.index.href()))
      let inspectHref = adminActionHref(admin, SECOND_EMAIL, 'inspect')
      await postFormFrom(app, routes.admin.index.href(), inspectHref, {})

      let inspectingHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(inspectingHtml, /Guest vase/)
      assert.doesNotMatch(inspectingHtml, />Tag</)
      assert.doesNotMatch(inspectingHtml, /formaction="\/tags\/apply"/)
      assert.doesNotMatch(inspectingHtml, /name="flip"/)
    } finally {
      await app.db.close()
    }
  })
})

function hrefAttr(href: string): RegExp {
  let htmlHref = href.replaceAll('&', '&amp;')
  let escaped = htmlHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`href="${escaped}"`)
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

function tagApplyHref(flipIds: string[], extra: string = ''): string {
  let params = new URLSearchParams()
  for (let id of flipIds) {
    params.append('flip', id)
  }
  if (extra !== '') {
    let extraParams = new URLSearchParams(extra)
    for (let [key, value] of extraParams) {
      params.append(key, value)
    }
  }
  let query = params.toString()
  return query === '' ? routes.tags.apply.index.href() : `${routes.tags.apply.index.href()}?${query}`
}

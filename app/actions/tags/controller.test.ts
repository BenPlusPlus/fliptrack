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

describe('Account Tags', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('lists Tags, rename keeps the Tag, and delete strips it from every Flip', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Oak dresser', itemCost: '40', tag: 'Goodwill' })
      await acquireFlip(app, { name: 'Pine stool', itemCost: '8', tag: 'Goodwill' })

      let account = await fetchPage(app, routes.account.href())
      assert.equal(account.status, 200)
      let accountHtml = await readBody(account)
      assert.match(accountHtml, /Tags/)
      assert.match(accountHtml, /Goodwill/)
      let tagId = tagIdFromAccount(accountHtml, 'Goodwill')

      let renamed = await postFormFrom(
        app,
        routes.account.href(),
        routes.tags.rename.href({ tagId }),
        { name: 'Thrift' },
      )
      assert.equal(renamed.status, 303)
      assert.equal(renamed.headers.get('Location'), routes.account.href())

      accountHtml = await readBody(await fetchPage(app, routes.account.href()))
      assert.match(accountHtml, /Thrift/)
      assert.doesNotMatch(accountHtml, /Goodwill/)

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let dresserHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventoryHtml, 'Oak dresser')),
      )
      assert.match(dresserHtml, />Thrift</)
      assert.doesNotMatch(dresserHtml, />Goodwill</)

      let confirm = await fetchPage(app, routes.tags.delete.index.href({ tagId }))
      assert.equal(confirm.status, 200)
      assert.match(await readBody(confirm), /strip/i)

      let deleted = await postForm(app, routes.tags.delete.index.href({ tagId }), {})
      assert.equal(deleted.status, 303)
      assert.equal(deleted.headers.get('Location'), routes.account.href())

      accountHtml = await readBody(await fetchPage(app, routes.account.href()))
      assert.doesNotMatch(accountHtml, /Thrift/)

      inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      dresserHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventoryHtml, 'Oak dresser')),
      )
      assert.doesNotMatch(dresserHtml, />Thrift</)
      let stoolHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventoryHtml, 'Pine stool')),
      )
      assert.doesNotMatch(stoolHtml, />Thrift</)
    } finally {
      await app.db.close()
    }
  })
})

function tagIdFromAccount(html: string, name: string): string {
  let escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = html.match(new RegExp(`/tags/([a-f0-9-]+)[^"]*"[^>]*>[\\s\\S]{0,200}?${escaped}`))
  if (!match) {
    match = html.match(new RegExp(`/tags/([a-f0-9-]+)`))
  }
  if (!match) {
    throw new Error(`Expected a Tag action for "${name}" in:\n${html.slice(0, 1500)}`)
  }
  return match[1]!
}

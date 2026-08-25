import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import {
  acquireFlip,
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
  flipHrefFromInventory,
  postFormFrom,
  readBody,
  resetBooks,
} from '../../../../test/helpers.ts'

describe('Re-split', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('refuses until Item costs sum to the parent, then retires the parent and copies Tags', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, {
        name: 'Thrift bag',
        itemCost: '20',
        taxPaid: '2',
        inboundShipping: '2',
        tag: 'Goodwill',
      })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let parentHref = flipHrefFromInventory(inventoryHtml, 'Thrift bag')
      let parentId = parentHref.replace('/flips/', '')
      let resplitHref = routes.flips.resplit.index.href({ flipId: parentId })

      let formPage = await fetchPage(app, resplitHref)
      assert.equal(formPage.status, 200)
      let formHtml = await readBody(formPage)
      assert.match(formHtml, /Acquisition cost/)
      assert.match(formHtml, /\$20\.00/)

      let refused = await postFormFrom(
        app,
        resplitHref,
        routes.flips.resplit.action.href({ flipId: parentId }),
        {
          'child_name.0': 'Shirt',
          'child_item_cost.0': '12',
          'child_name.1': 'Mug',
          'child_item_cost.1': '5',
        },
      )
      assert.equal(refused.status, 400)
      assert.match(await readBody(refused), /sum to the parent/)

      let saved = await postFormFrom(app, resplitHref, routes.flips.resplit.action.href({ flipId: parentId }), {
        'child_name.0': 'Shirt',
        'child_item_cost.0': '12',
        'child_name.1': 'Mug',
        'child_item_cost.1': '8',
      })
      assert.equal(saved.status, 303)

      let inventory = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.doesNotMatch(inventory, /Thrift bag/)
      assert.match(inventory, /Shirt/)
      assert.match(inventory, /Mug/)

      let shirtHtml = await readBody(
        await fetchPage(app, flipHrefFromInventory(inventory, 'Shirt')),
      )
      assert.match(shirtHtml, />Goodwill</)
      assert.match(shirtHtml, /value="12"/)
      assert.match(shirtHtml, /value="1.20"/)
      assert.match(shirtHtml, /value="1.20"/)

      let mugHtml = await readBody(await fetchPage(app, flipHrefFromInventory(inventory, 'Mug')))
      assert.match(mugHtml, />Goodwill</)
      assert.match(mugHtml, /value="8"/)
      assert.match(mugHtml, /value="0.80"/)

      let parentHtml = await readBody(await fetchPage(app, parentHref))
      assert.match(parentHtml, /Retired/)
      assert.doesNotMatch(parentHtml, /Re-split/)
    } finally {
      await app.db.close()
    }
  })
})

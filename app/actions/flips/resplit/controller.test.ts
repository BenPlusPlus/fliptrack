import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import { RESPLIT_CHILD_CAP } from '../../../utils/resplit.ts'
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

  it('opens with two empty children and refuses a blank extra row', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Thrift bag', itemCost: '20' })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let parentHref = flipHrefFromInventory(inventoryHtml, 'Thrift bag')
      let parentId = parentHref.replace('/flips/', '')
      let resplitHref = routes.flips.resplit.index.href({ flipId: parentId })

      let formHtml = await readBody(await fetchPage(app, resplitHref))
      assert.equal([...formHtml.matchAll(/name="child_name\.\d+"/g)].length, 2)
      assert.doesNotMatch(formHtml, /child_name\.2/)
      assert.match(formHtml, /Add Flip/)
      assert.match(formHtml, /Duplicate/)
      assert.match(formHtml, /Split into/)
      assert.match(formHtml, /rmx-document/)

      let refused = await postFormFrom(
        app,
        resplitHref,
        routes.flips.resplit.action.href({ flipId: parentId }),
        {
          'child_name.0': 'Shirt',
          'child_item_cost.0': '12',
          'child_name.1': 'Mug',
          'child_item_cost.1': '8',
          'child_name.2': '',
          'child_item_cost.2': '',
        },
      )
      assert.equal(refused.status, 400)
      assert.match(await readBody(refused), /Flip name is required/)
    } finally {
      await app.db.close()
    }
  })

  it('refuses until Item costs sum to the parent, then retires the parent and copies Tags', async () => {
    let app = await createTestApp()
    try {
      let acquired = await createOperatorViaOobe(app).then(() =>
        acquireFlip(app, {
          name: 'Thrift bag',
          itemCost: '20',
          taxPaid: '2',
          inboundShipping: '2',
          tag: 'Goodwill',
        }),
      )

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
      assert.equal(
        saved.headers.get('Location'),
        routes.acquisitions.show.href({ acquisitionId: acquired.acquisitionId }),
      )

      let haul = await readBody(await fetchPage(app, saved.headers.get('Location')!))
      assert.match(haul, /Shirt/)
      assert.match(haul, /Mug/)
      assert.doesNotMatch(haul, /Thrift bag/)

      let inventory = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.doesNotMatch(inventory, /Thrift bag/)
      assert.match(inventory, /Shirt/)
      assert.match(inventory, /Mug/)

      let shirtHtml = await readBody(await fetchPage(app, flipHrefFromInventory(inventory, 'Shirt')))
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

  it('refuses more than 50 children', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Pack', itemCost: String(RESPLIT_CHILD_CAP + 1) })

      let inventoryHtml = await readBody(await fetchPage(app, routes.inventory.href()))
      let parentHref = flipHrefFromInventory(inventoryHtml, 'Pack')
      let parentId = parentHref.replace('/flips/', '')
      let resplitHref = routes.flips.resplit.index.href({ flipId: parentId })

      let fields: Record<string, string> = {}
      for (let index = 0; index <= RESPLIT_CHILD_CAP; index += 1) {
        fields[`child_name.${index}`] = `Card ${index}`
        fields[`child_item_cost.${index}`] = '1'
      }

      let refused = await postFormFrom(
        app,
        resplitHref,
        routes.flips.resplit.action.href({ flipId: parentId }),
        fields,
      )
      assert.equal(refused.status, 400)
      assert.match(await readBody(refused), /50 Flips/)
    } finally {
      await app.db.close()
    }
  })
})

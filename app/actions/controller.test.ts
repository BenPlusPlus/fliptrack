import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../routes.ts'
import {
  createOperatorViaOobe,
  createTestApp,
  fetchPage,
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

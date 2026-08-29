import * as assert from 'remix/assert'
import { createTestServer } from 'remix/node-fetch-server/test'
import { describe, it } from 'remix/test'

import { routes } from '../../../routes.ts'
import {
  createOperatorViaOobe,
  createTestApp,
  TEST_EMAIL,
  TEST_PASSWORD,
} from '../../../../test/helpers.ts'

describe('New Acquisition date default', () => {
  it('fills today after clicking New Acquisition from Home', async (t) => {
    let app = await createTestApp()
    t.after(async () => {
      await app.db.close()
    })
    await createOperatorViaOobe(app)

    let server = await createTestServer((request) => app.router.fetch(request))
    let page = await t.serve(server)

    await page.goto(routes.login.index.href())
    await page.locator('input[name="email"]').fill(TEST_EMAIL)
    await page.locator('input[name="password"]').fill(TEST_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.getByRole('link', { name: 'New Acquisition' }).waitFor()

    await page.getByRole('link', { name: 'New Acquisition' }).click()
    await page.locator('#acquisition_date').waitFor()
    await page.waitForFunction(() => {
      let el = document.getElementById('acquisition_date')
      return el instanceof HTMLInputElement && el.value !== ''
    })

    let value = await page.locator('#acquisition_date').inputValue()
    let now = new Date()
    let expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
    assert.equal(value, expected)
  })
})

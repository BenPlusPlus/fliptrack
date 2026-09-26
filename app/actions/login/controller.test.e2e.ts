import * as assert from 'remix/assert'
import { createTestServer } from 'remix/node-fetch-server/test'
import { describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import {
  createOperatorViaOobe,
  createTestApp,
  resetBooks,
  TEST_EMAIL,
} from '../../../test/helpers.ts'

describe('login failure', () => {
  it('shows an error when email or password is wrong', async (t) => {
    let app = await createTestApp()
    t.after(async () => {
      await resetBooks(app.db)
      await app.db.close()
    })
    await createOperatorViaOobe(app)

    let server = await createTestServer((request) => app.router.fetch(request))
    let page = await t.serve(server)

    await page.goto(routes.login.index.href())
    await page.waitForLoadState('networkidle')
    await page.locator('input[name="email"]').fill(TEST_EMAIL)
    await page.locator('input[name="password"]').fill('not-the-password')
    await page.locator('form[action="/login"] button[type="submit"]').click()

    let alert = page.getByRole('alert')
    await alert.waitFor()
    assert.match((await alert.textContent()) ?? '', /Email or password is wrong/)
    assert.equal(await alert.isVisible(), true)
    assert.doesNotMatch(await page.locator('body').innerText(), /Frame error/)
    assert.match(page.url(), /\/login/)
  })
})
